'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import classNames from 'classnames';
import { Copy, LogOut, SettingsIcon, User as UserUI, Share2 } from 'lucide-react';
import CustomButton from '@/components/custom/custom-button';
import BoderImage from '@/components/common/border-image';
import { collapseAddress } from '@/components/utils/address';
import ProfileElementDecor1 from '@/public/assets/svgs/profile-element-decor-1.svg';
import DashboardAvatar from './dashboard-avatar';
import DashboardTopProfileDecor from './dashboard-top-profile-decor';
import { signOut } from 'next-auth/react';
import AugmentedPopup from '@/components/augmented/components/augmented-popup';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import AptosReceiveModal from './aptos-receive-modal';
import { useWalletSelector } from "@/components/context/wallet-selector-provider"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { User } from '@/db/schema';
import { useSearchParams } from 'next/dist/client/components/navigation';

const DashboardProfile = ({ user }: { user: User | null }) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [isOpenSend, setIsOpenSend] = useState<boolean>(false);
  const [amount, setAmount] = useState<string | null>(null);
  const [receive, setReceive] = useState<string | null>(null);
  const [isOpenReceive, setIsOpenReceive] = useState<boolean>(false);
  const [pending, setPending] = useState<boolean>(false);
  const { toast } = useToast();
  const { accountId, selector,getBalance,callMethod,sendToken } = useWalletSelector();
  const search = useSearchParams();
  const transactionHash = search.get('transactionHashes');
  const [toastShown, setToastShown] = useState<boolean>(false);

  const showToast = useCallback((props: { title: string; description: string; variant?: 'default' | 'destructive' }) => {
    toast({
      ...props,
      duration: 3000,
    });
  }, [toast]);

  useEffect(() => {
    if (transactionHash && !toastShown) {
      showToast({
        title: 'Success',
        description: 'Transaction sent successfully.'
      });
      setToastShown(false);
    }
  }, [transactionHash, showToast]);

  useEffect(() => {
    if (transactionHash) {
      setToastShown(true);
    }
  }, [transactionHash]);

  useEffect(() => {
    if (accountId) {
      getBalance(accountId).then((balance) => setBalance(balance.toString()));
    }
  }, [accountId]);

  const toggleOpenSend = () => {
    setIsOpenSend(!isOpenSend);
  };

  const toggleOpenReceive = () => {
    setIsOpenReceive(!isOpenReceive);
  };

  const handleCloseSend = () => {
    setIsOpenSend(false);
  };

  const onTransfer = async () => {
    setPending(true);
    try {
      await sendToken(receive as string, amount as string);
      showToast({
        title: 'Success',
        description: 'Transaction initiated successfully.'
      });
      setPending(false);
      handleCloseSend();
    } catch (error) {
      console.error('Error sending transaction:', error);
      showToast({
        title: 'Error',
        description: 'Failed to send transaction.',
        variant: 'destructive'
      });
      setPending(false);
    }
  };

  const copyAddress = useCallback(async () => {
    if (!accountId) return;
    try {
      await navigator.clipboard.writeText(accountId);
      showToast({
        title: 'Success',
        description: 'Copied wallet address to clipboard.'
      });
    } catch {
      showToast({
        title: 'Error',
        description: 'Failed to copy wallet address.',
        variant: 'destructive'
      });
    }
  }, [accountId, showToast]);

  const copyProfileLink = useCallback(async () => {
    const profileUrl = `${window.location.origin}/profile/${accountId}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      showToast({
        title: 'Success',
        description: 'Copied profile link to clipboard.'
      });
    } catch {
      showToast({
        title: 'Error',
        description: 'Failed to copy profile link.',
        variant: 'destructive'
      });
    }
  }, [accountId, showToast]);

  const disconnect = async() => {
    signOut();
    const wallet = await selector.wallet();
    await wallet.signOut();
    localStorage.removeItem('activeUser');
    localStorage.removeItem('widget-storage');
  }
  

  return (
    <BoderImage className={classNames('relative flex w-full max-w-[483px] justify-center')}>
      <DashboardTopProfileDecor />
      <div className="relative flex flex-col gap-6 px-4 py-6 w-full mt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex grow flex-wrap items-center gap-2 md:flex-nowrap">
            <DashboardAvatar className="shrink-0" imageUrl={'/assets/images/avatar/avatar-1.jpeg'} altText="Avatar" />
            <div className="flex w-full flex-col items-start gap-3">
              <p className="text-wrap break-words text-xl font-bold">
                {accountId && collapseAddress(accountId)}
              </p>
              <p className="text-sm">Welcome back</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SettingsIcon className="h-6 w-6 shrink-0 cursor-pointer" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={copyAddress} className="gap-2">
                <Copy className="h-4 w-4" /> Copy address
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/profile/${accountId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-2"
                >
                  <UserUI className="h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={copyProfileLink} className="gap-2">
                <Share2 className="h-4 w-4" /> Share Profile
              </DropdownMenuItem>
              {/*{wallet && isAptosConnectWallet(wallet) && (
                <DropdownMenuItem asChild>
                  <a href={APTOS_CONNECT_ACCOUNT_URL} target="_blank" rel="noopener noreferrer" className="flex gap-2">
                    <UserUI className="h-4 w-4" /> Account
                  </a>
                </DropdownMenuItem>
              )}*/}
              <DropdownMenuItem onSelect={disconnect} className="gap-2">
                <LogOut className="h-4 w-4" /> Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative flex flex-wrap justify-between gap-2">
          <div className="flex grow flex-col gap-2">
            <p className="text-base text-[#636363]">Total balance</p>
            <p className="text-h2">{balance ? Number(balance).toFixed(2) : '0'}</p>
          </div>
          <div
            className="flex shrink-0 flex-col justify-end font-semibold underline"
            style={{
              textUnderlineOffset: '4px'
            }}
          >
            <p>TOKENS (3)</p>
          </div>
          <Image
            src={ProfileElementDecor1.src}
            alt="Profile Top Right Element Decor"
            width={ProfileElementDecor1.width}
            height={ProfileElementDecor1.height}
            className="absolute right-0 top-0 z-0 -translate-y-1/2"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap w-full">
          <CustomButton className="w-full md:w-1/2" onClick={toggleOpenSend}>
            <i className="ico-send-right-icon" /> Send
          </CustomButton>
          <CustomButton className="w-full md:w-1/2" onClick={toggleOpenReceive}>
            <i className="ico-wallet-icon" /> Receive
          </CustomButton>
        </div>
        <AugmentedPopup visible={isOpenSend} onClose={handleCloseSend} textHeading={'Send'}>
          <div className="flex max-h-[80vh] flex-col gap-5 overflow-y-auto p-8">
            <p className="mb-5 text-white">Send APT to another address</p>
            <input
              type="text"
              placeholder="Receiver Address"
              value={receive || ''}
              onChange={e => setReceive(e.target.value)}
              className="w-full rounded border border-gray-700 bg-transparent p-2 text-white focus:border-gray-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Amount"
              value={amount || ''}
              onChange={e => setAmount(e.target.value)}
              className="w-full rounded border border-gray-700 bg-transparent p-2 text-white focus:border-gray-500 focus:outline-none"
            />
            <CustomButton className="w-full md:w-auto" onClick={onTransfer} disabled={pending || !amount || !receive}>
              <i className="ico-send-right-icon" /> {pending ? 'Sending...' : 'Send'}
            </CustomButton>
          </div>
        </AugmentedPopup>
        <AptosReceiveModal
          isOpen={isOpenReceive}
          onClose={() => setIsOpenReceive(false)}
          address={accountId as string}
        />
      </div>
    </BoderImage>
  );
};

export default DashboardProfile;
