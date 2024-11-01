import Web3 from 'web3';
import { bytesToHex } from '@ethereumjs/util';
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import {
  deriveChildPublicKey,
  najPublicKeyStrToUncompressedHexPoint,
  uncompressedHexPointToEvmAddress,
} from './kdf';
import { Common } from '@ethereumjs/common';
import { Contract, JsonRpcProvider } from 'ethers';
import { parseNearAmount } from 'near-api-js/lib/utils/format';

export interface GasPrice {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export interface DerivedAddress {
  publicKey: Buffer;
  address: string;
}

export interface TransactionData {
  transaction: FeeMarketEIP1559Transaction;
  payload: Buffer;
}

export interface Signature {
  big_r: any; // Replace `any` with specific types if known
  s: any;
  recovery_id: number;
}

export class Ethereum {
  private web3: Web3;
  private provider: JsonRpcProvider;
  private chain_id: number;

  constructor(chain_rpc: string, chain_id: number) {
    this.web3 = new Web3(chain_rpc);
    this.provider = new JsonRpcProvider(chain_rpc);
    this.chain_id = chain_id;
    this.queryGasPrice();
  }

  async deriveAddress(
    accountId: string,
    derivation_path: string
  ): Promise<DerivedAddress> {
    const publicKey = await deriveChildPublicKey(
      najPublicKeyStrToUncompressedHexPoint(),
      accountId,
      derivation_path
    );
    const address = await uncompressedHexPointToEvmAddress(publicKey);
    return { publicKey: Buffer.from(publicKey, 'hex'), address };
  }

  async queryGasPrice(): Promise<GasPrice> {
    const maxFeePerGas = await this.web3.eth.getGasPrice();
    const maxPriorityFeePerGas = await this.web3.eth.getMaxPriorityFeePerGas();
    return { maxFeePerGas, maxPriorityFeePerGas } as any;
  }

  async getBalance(accountId: string): Promise<string> {
    const balance = await this.web3.eth.getBalance(accountId);
    return this.web3.utils.fromWei(balance, 'ether');
  }

  async getContractViewFunction(
    receiver: string,
    abi: any, // Replace `any` with specific ABI type if available
    methodName: string,
    args: any[] = []
  ): Promise<any> {
    const contract = new Contract(receiver, abi, this.provider);
    return await contract[methodName](...args);
  }

  createTransactionData(
    receiver: string,
    abi: any,
    methodName: string,
    args: any[] = []
  ): string {
    const contract = new Contract(receiver, abi);
    return contract.interface.encodeFunctionData(methodName, args);
  }

  async createPayload(
    sender: string,
    receiver: string,
    amount: string,
    data: string
  ): Promise<TransactionData> {
    const common = new Common({ chain: this.chain_id });
    const nonce = await this.web3.eth.getTransactionCount(sender);
    const { maxFeePerGas, maxPriorityFeePerGas } = await this.queryGasPrice();

    const transactionData: any = {
      nonce,
      gasLimit: 50_000,
      maxFeePerGas,
      maxPriorityFeePerGas,
      to: receiver,
      data: data,
      value: BigInt(this.web3.utils.toWei(amount, 'ether')),
      chain: this.chain_id,
    };

    const transaction = FeeMarketEIP1559Transaction.fromTxData(
      transactionData,
      { common }
    );
    const payload = transaction.getHashedMessageToSign();

    sessionStorage.setItem(
      'transaction',
      JSON.stringify(Array.from(transaction.serialize()))
    );
    return { transaction, payload } as any;
  }

  async requestSignatureToMPC(
    wallet: any, // Replace `any` with specific wallet type if available
    contractId: string,
    path: string,
    ethPayload: Buffer
  ): Promise<Signature> {
    sessionStorage.setItem('derivation', path);

    const payload = Array.from(ethPayload);
    const { big_r, s, recovery_id } = await wallet.callMethod({
      contractId,
      method: 'sign',
      args: { request: { payload, path, key_version: 0 } },
      gas: '250000000000000',
      deposit: parseNearAmount('0.25'),
    });
    return { big_r, s, recovery_id };
  }

  async reconstructSignature(
    big_r: any, // Replace `any` with specific type if known
    S: any,
    recovery_id: number,
    transaction: FeeMarketEIP1559Transaction
  ): Promise<FeeMarketEIP1559Transaction> {
    const r = Buffer.from(big_r.affine_point.substring(2), 'hex');
    const s = Buffer.from(S.scalar, 'hex');
    const v: any = recovery_id;

    const signature = transaction.addSignature(v, r, s);

    if (signature.getValidationErrors().length > 0)
      throw new Error('Transaction validation errors');
    if (!signature.verifySignature()) throw new Error('Signature is not valid');
    return signature;
  }

  async reconstructSignatureFromLocalSession(
    big_r: any, // Replace `any` with specific type if known
    s: any,
    recovery_id: number
  ): Promise<FeeMarketEIP1559Transaction> {
    const serialized = Uint8Array.from(
      JSON.parse(`[${sessionStorage.getItem('transaction')}]`)
    );
    const transaction =
      FeeMarketEIP1559Transaction.fromSerializedTx(serialized);
    return this.reconstructSignature(big_r, s, recovery_id, transaction);
  }

  async relayTransaction(
    signedTransaction: FeeMarketEIP1559Transaction
  ): Promise<string> {
    const serializedTx = bytesToHex(signedTransaction.serialize());
    const relayed = await this.web3.eth.sendSignedTransaction(serializedTx);
    return relayed.transactionHash as any;
  }
}
