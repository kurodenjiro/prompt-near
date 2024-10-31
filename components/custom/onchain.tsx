'use client';


import ProfileBtnFrame from '@/public/assets/svgs/profile-btn-frame.svg';
import React, { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { useWalletSelector } from "@/components/context/wallet-selector-provider"

export const SmartAction = ({ props: data, functionName }: { props: any, functionName: string }) => {

    const { modal, accountId, selector } = useWalletSelector();

    const filteredObj = Object.entries(data)
        .filter(([key, value]) => key !== 'CoinType')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    const filteredObjCointype = Object.keys(data)
        .filter((key) => key === 'CoinType')
        .reduce((acc, key) => ({ ...acc, [key]: data[key] }), {});

    const params: any = {
        functionArguments: Object.values(filteredObj).map((item: any) =>
            typeof item === 'number' ? BigInt(item * 10 ** 18) : item
        ),
        function: functionName.replaceAll('o0', '::'),
        typeArguments: Object.values(filteredObjCointype),
    }
    console.log(params);
    const [isAccountAddress, setIsAccountAddress] = useState(null);

    const logout = async () => {
        await signOut({ redirectTo: '/login' })

    }
    useEffect(() => {
        if (accountId) {
            setIsAccountAddress(accountId as any)
        }
    }, [accountId])
    const onTransfer = async () => {
        console.log(accountId)
        try {
            const wallet = await selector.wallet("my-near-wallet");
            await wallet.signAndSendTransaction({
                actions: [
                    {
                        type: "FunctionCall",
                        params: {
                            methodName: "addMessage",
                            args: { text: "Hello World!" },
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
                        onClick={logout}
                    >
                        <i className="ico-send-right-icon" /> Need auth
                    </div>
                )}

            </div>
        </>
    );
};
