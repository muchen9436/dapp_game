import React, { useState, useEffect } from 'react';
import { Button, Toast } from 'antd-mobile';
import Web3 from 'web3';
import './App.css';
import LotteryContract from './contracts/Lottery.json';

const Lottery = () => {
    const [web3, setWeb3] = useState(null);
    const [account, setAccount] = useState('');
    const [manager, setManager] = useState('');
    const [players, setPlayers] = useState([]);
    const [balance, setBalance] = useState('');
    const [message, setMessage] = useState('');
    const [lottery, setLottery] = useState(null);
    const [winner, setWinner] = useState('');

    useEffect(() => {
        const init = async () => {
            try {
                if (window.ethereum) {
                    const web3Instance = new Web3(window.ethereum);
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    setWeb3(web3Instance);

                    const accounts = await web3Instance.eth.getAccounts();
                    setAccount(accounts[0]);

                    const networkId = await web3Instance.eth.net.getId();
                    const deployedNetwork = LotteryContract.networks[networkId];
                    if (deployedNetwork) {
                        const lotteryInstance = new web3Instance.eth.Contract(
                            LotteryContract.abi,
                            deployedNetwork.address
                        );
                        setLottery(lotteryInstance);

                        const managerAddress = await lotteryInstance.methods.manager().call();
                        setManager(managerAddress);

                        const playersList = await lotteryInstance.methods.getPlayers().call();
                        setPlayers(playersList);

                        const contractBalance = await web3Instance.eth.getBalance(lotteryInstance.options.address);
                        setBalance(contractBalance);
                    } else {
                        Toast.show({
                            icon: 'fail',
                            content: '合约未部署在该网络'
                        });
                    }

                } else {
                    Toast.show({
                        icon: 'fail',
                        content: '请安装 MetaMask！'
                    });
                }
            } catch (error) {
                Toast.show({
                    icon: 'fail',
                    content: `初始化出错: ${error.message}`
                });
            }
        };

        init();
    }, [web3]);

    const onEnter = async () => {
        try {
            setMessage('交易处理中，请稍候...');
            await lottery.methods.enter().send({
                from: account,
                value: web3.utils.toWei('0.01', 'ether')
            });
            setMessage('你已成功进入抽奖！');
            await refreshData();
        } catch (error) {
            Toast.show({
                icon: 'fail',
                content: '参与抽奖失败'
            });
            setMessage('');
        }
    };

    const onClick = async () => {
        try {
            if (account !== manager) {
                Toast.show({
                    icon: 'fail',
                    content: '只有管理员可以选取中奖者'
                });
                return;
            }
            setMessage('正在抽取中奖者，请稍候...');
            await lottery.methods.pickWinner().send({
                from: account
            });
            setMessage('中奖者已选出！');
            const winnerAddress = await lottery.methods.getLastWinner().call();
            setWinner(winnerAddress);
            await refreshData();
        } catch (error) {
            Toast.show({
                icon: 'fail',
                content: `选取中奖者失败: ${error.message}`
            });
            setMessage('');
        }
    };

    const refreshData = async () => {
        const playersList = await lottery.methods.getPlayers().call();
        setPlayers(playersList);

        const contractBalance = await web3.eth.getBalance(lottery.options.address);
        setBalance(contractBalance);
    };


    return (
        <div className="lottery-container">
            <h2>抽奖游戏</h2>
            <p>
                该游戏由管理员 {manager} 管理，目前共有 {players.length} 位玩家参与，
                奖池金额为 {web3 && web3.utils.fromWei(balance, "ether")} ETH。
            </p>

            <h4>想要试试运气吗？</h4>
            <Button block type="primary" size="large" onClick={onEnter}>参与抽奖 (0.01 ETH)</Button>

            {account === manager && (
                <>
                    <h4>开始抽奖</h4>
                    <Button block type="primary" size="large" onClick={onClick}>选出中奖者</Button>
                </>
            )}
            <h1>{message}</h1>
            {winner && (
                <div>
                    <h2>中奖者: {winner}</h2>
                </div>
            )}
        </div>
    );
};

export default Lottery;
