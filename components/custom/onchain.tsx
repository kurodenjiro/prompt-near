'use client';


import ProfileBtnFrame from '@/public/assets/svgs/profile-btn-frame.svg';
import React, { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { useWalletSelector } from "@/components/context/wallet-selector-provider"
import { Ethereum } from "@/lib/services/ethereum";
import { useDebounce } from "@/hooks/use-debounce"
export const SmartAction = ({ props: data, methods, receiverId }: { props: any, methods: string, receiverId: string }) => {

    const { accountId, selector, modal } = useWalletSelector();
    const [isAccountAddress, setIsAccountAddress] = useState(null);

    useEffect(() => {
        if (accountId) {
            console.log(accountId)
            setIsAccountAddress(accountId as any)
        }
    }, [accountId])

    const onTransfer = async () => {
        try {
            const wallet = await selector.wallet();
            await wallet.signAndSendTransaction({
                signerId: accountId!,
                receiverId,
                actions: [
                    {
                        type: "FunctionCall",
                        params: {
                            methodName: methods,
                            args: data,
                            gas: "30000000000000",
                            deposit: "10000000000000000000000",
                        },
                    },
                ],
            });
        } catch (err) {
            console.error('Error', err);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-3 px-4 py-3 text-white">
                <span>Function : {data.function}</span>
                <p>
                    {JSON.stringify(
                        data,
                        (key, value) => (typeof value === 'bigint' ? value.toString() : value) // return everything else unchanged
                    )}
                </p>
                {isAccountAddress ? (<div
                    style={{ borderImageSource: `url("${ProfileBtnFrame.src}")` }}
                    className="flex w-full cursor-pointer items-center justify-center gap-1 px-11 py-1 uppercase [border-image-slice:13_fill] [border-image-width:15px] md:w-auto "
                    onClick={onTransfer}
                >
                    <i className="ico-send-right-icon" /> Excute
                </div>) : (
                    <div
                        style={{ borderImageSource: `url("${ProfileBtnFrame.src}")` }}
                        className="flex w-full cursor-pointer items-center justify-center gap-1 px-11 py-1 uppercase [border-image-slice:13_fill] [border-image-width:15px] md:w-auto "
                        onClick={modal.show}
                    >
                        <i className="ico-send-right-icon" /> Login to excute
                    </div>
                )}

            </div>
        </>
    );
};

export const ChainSignature = ({ props: data, methods, receiverId }: { props: any, methods: string, receiverId: string }) => {


    const { accountId, selector, modal } = useWalletSelector();
    const [isAccountAddress, setIsAccountAddress] = useState(null);
    const [senderAddress, setSenderAddress] = useState("");
    const [abi, setAbi] = useState("");
    const [derivation, setDerivation] = useState(sessionStorage.getItem('derivation') || "ethereum-1");
    const derivationPath = useDebounce(derivation, 1200);
    const [number, setNumber] = useState(1000);
    const Eth = new Ethereum('https://1rpc.io/eth', 1);
    useEffect(() => {
        if (accountId) {
            //get abi
            getEthAddress()
        }
    }, [accountId])

    const getEthAddress = async () => {
        setIsAccountAddress(accountId as any)

        const { address } = await Eth.deriveAddress(accountId as string, derivationPath);
        setSenderAddress(address);

        const response = await fetch(
            `http://localhost:3000/api/abieth?account=${receiverId}&network=mainnet&chain=eth`
        );
        const data = await response.json();

        setAbi(data)
    }
    const createChainSignature = async () => {
        //get abi
        const wallet = await selector.wallet();
    
        const contract = receiverId
        const MPC_CONTRACT = "v1.signer"
        console.log("contract", data, methods, abi, contract)
        const dataPayload = Eth.createTransactionData(contract, abi, methods, ["0x93CFe1c3fdF394b2EB4D68CCB42b3Ac3b1D86488", 12345678901234567890n]);
        const { transaction, payload } = await Eth.createPayload(senderAddress, contract, 0 as any, dataPayload);

        try {
            // wallet dont have methodCall
            const { big_r, s, recovery_id } = await Eth.requestSignatureToMPC(wallet, MPC_CONTRACT, derivationPath, payload);
            const signedTransaction = await Eth.reconstructSignature(big_r, s, recovery_id, transaction);

        } catch (e) {
            console.log(e)
        }
    }

    return (
        <>
            <div className="flex flex-col gap-3 px-4 py-3 text-white">
                <span>Function : {data.function}</span>
                <p>
                    {JSON.stringify(
                        data,
                        (key, value) => (typeof value === 'bigint' ? value.toString() : value) // return everything else unchanged
                    )}
                </p>
                {isAccountAddress ? (<div
                    style={{ borderImageSource: `url("${ProfileBtnFrame.src}")` }}
                    className="flex w-full cursor-pointer items-center justify-center gap-1 px-11 py-1 uppercase [border-image-slice:13_fill] [border-image-width:15px] md:w-auto "
                    onClick={createChainSignature}
                >
                    <i className="ico-send-right-icon" /> Excute
                </div>) : (
                    <div
                        style={{ borderImageSource: `url("${ProfileBtnFrame.src}")` }}
                        className="flex w-full cursor-pointer items-center justify-center gap-1 px-11 py-1 uppercase [border-image-slice:13_fill] [border-image-width:15px] md:w-auto "
                        onClick={modal.show}
                    >
                        <i className="ico-send-right-icon" /> Login to excute
                    </div>
                )}

            </div>
        </>
    );
};
