'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface PlayerStats {
  playerName: string;
  count: number;
  totalPayment: number;
}

interface PaymentMethodStats {
  method: string;
  count: number;
  total: number;
}

interface MonthlyStats {
  month: string;
  count: number;
  payment: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentMethodStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalNFTs: 0,
    totalPayment: 0,
    avgPayment: 0,
    venueAttendees: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const nftsSnapshot = await getDocs(collection(db, 'nfts'));
      const nfts = nftsSnapshot.docs.map(doc => doc.data());

      // 選手別統計
      const playerMap = new Map<string, { count: number; totalPayment: number }>();
      nfts.forEach(nft => {
        const playerName = nft.playerName;
        const current = playerMap.get(playerName) || { count: 0, totalPayment: 0 };
        playerMap.set(playerName, {
          count: current.count + 1,
          totalPayment: current.totalPayment + (nft.paymentAmount || 0),
        });
      });

      const playerStatsData: PlayerStats[] = Array.from(playerMap.entries())
        .map(([playerName, stats]) => ({
          playerName,
          count: stats.count,
          totalPayment: stats.totalPayment,
        }))
        .sort((a, b) => b.count - a.count);

      setPlayerStats(playerStatsData);

      // 支払方法別統計
      const paymentMap = new Map<string, { count: number; total: number }>();
      nfts.forEach(nft => {
        const method = nft.paymentMethod || 'unknown';
        const current = paymentMap.get(method) || { count: 0, total: 0 };
        paymentMap.set(method, {
          count: current.count + 1,
          total: current.total + (nft.paymentAmount || 0),
        });
      });

      const paymentStatsData: PaymentMethodStats[] = Array.from(paymentMap.entries())
        .map(([method, stats]) => ({
          method,
          count: stats.count,
          total: stats.total,
        }))
        .sort((a, b) => b.count - a.count);

      setPaymentStats(paymentStatsData);

      // 月別統計（過去12ヶ月）
      const monthlyMap = new Map<string, { count: number; payment: number }>();
      nfts.forEach(nft => {
        const createdAt = nft.createdAt?.toDate();
        if (createdAt) {
          const year = createdAt.getFullYear();
          const month = createdAt.getMonth() + 1;
          const monthStr = `${year}年${month}月`;
          const current = monthlyMap.get(monthStr) || { count: 0, payment: 0 };
          monthlyMap.set(monthStr, {
            count: current.count + 1,
            payment: current.payment + (nft.paymentAmount || 0),
          });
        }
      });

      const monthlyStatsData: MonthlyStats[] = Array.from(monthlyMap.entries())
        .map(([month, stats]) => ({
          month,
          count: stats.count,
          payment: stats.payment,
        }))
        .sort((a, b) => {
          const [aYear, aMonth] = a.month.match(/\d+/g)!.map(Number);
          const [bYear, bMonth] = b.month.match(/\d+/g)!.map(Number);
          return aYear === bYear ? aMonth - bMonth : aYear - bYear;
        })
        .slice(-12); // 最新12ヶ月分

      setMonthlyStats(monthlyStatsData);

      // 総合統計
      const totalPayment = nfts.reduce((sum, nft) => sum + (nft.paymentAmount || 0), 0);
      const venueAttendees = nfts.filter(nft => nft.isVenueAttendee).length;

      setTotalStats({
        totalNFTs: nfts.length,
        totalPayment,
        avgPayment: nfts.length > 0 ? totalPayment / nfts.length : 0,
        venueAttendees,
      });
    } catch (error) {
      console.error('分析データ取得エラー:', error);
      alert('分析データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl font-black text-yellow-300">読み込み中...</p>
        </div>
      </div>
    );
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'credit': return 'クレジットカード';
      case 'paypay': return 'PayPay';
      case 'aupay': return 'auPay';
      default: return method;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* タイトル */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">📊</div>
        <h1 className="text-5xl font-black text-yellow-300 mb-4 tracking-wider">
          詳細分析
        </h1>
        <p className="text-xl text-gray-300 font-bold">
          データドリブンな意思決定をサポート
        </p>
      </div>

      {/* サマリー統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 border-4 border-yellow-400 text-center">
          <p className="text-sm text-yellow-200 font-bold mb-2">総NFT数</p>
          <p className="text-4xl font-black text-yellow-300">{totalStats.totalNFTs}</p>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 border-4 border-yellow-400 text-center">
          <p className="text-sm text-yellow-200 font-bold mb-2">総売上</p>
          <p className="text-4xl font-black text-yellow-300">¥{totalStats.totalPayment.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 border-4 border-yellow-400 text-center">
          <p className="text-sm text-yellow-200 font-bold mb-2">平均単価</p>
          <p className="text-4xl font-black text-yellow-300">¥{Math.round(totalStats.avgPayment).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-6 border-4 border-yellow-400 text-center">
          <p className="text-sm text-yellow-200 font-bold mb-2">現地参加率</p>
          <p className="text-4xl font-black text-yellow-300">
            {totalStats.totalNFTs > 0 ? Math.round((totalStats.venueAttendees / totalStats.totalNFTs) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* 選手別ランキング */}
        <div className="bg-gray-800 p-8 shadow-2xl border-4 border-red-600">
          <h2 className="text-3xl font-black text-yellow-300 mb-6 tracking-wider">
            ⚽ 選手別応援ランキング
          </h2>
          <div className="space-y-4">
            {playerStats.slice(0, 10).map((player, index) => (
              <div
                key={player.playerName}
                className="flex items-center justify-between bg-gray-700 p-4 border-2 border-gray-600"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-black text-yellow-300">#{index + 1}</span>
                  <div>
                    <p className="font-black text-yellow-300 text-lg">{player.playerName}</p>
                    <p className="text-sm text-gray-400 font-medium">
                      {player.count}件 / ¥{player.totalPayment.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="bg-red-600 h-6"
                    style={{
                      width: `${Math.max(50, (player.count / playerStats[0].count) * 200)}px`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 支払方法別統計 */}
        <div className="bg-gray-800 p-8 shadow-2xl border-4 border-red-600">
          <h2 className="text-3xl font-black text-yellow-300 mb-6 tracking-wider">
            💳 支払方法別統計
          </h2>
          <div className="space-y-4">
            {paymentStats.map((payment) => (
              <div
                key={payment.method}
                className="bg-gray-700 p-6 border-2 border-gray-600"
              >
                <div className="flex justify-between items-center mb-2">
                  <p className="font-black text-yellow-300 text-xl">
                    {getPaymentMethodLabel(payment.method)}
                  </p>
                  <p className="font-black text-yellow-300 text-2xl">
                    {payment.count}件
                  </p>
                </div>
                <div className="flex justify-between text-gray-400 font-medium">
                  <span>合計金額</span>
                  <span className="text-yellow-300 font-bold">¥{payment.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400 font-medium">
                  <span>平均金額</span>
                  <span className="text-yellow-300 font-bold">
                    ¥{Math.round(payment.total / payment.count).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 月別統計グラフ */}
      <div className="bg-gray-800 p-8 shadow-2xl border-4 border-red-600">
        <h2 className="text-3xl font-black text-yellow-300 mb-6 tracking-wider">
          📅 月別NFT発行数推移（過去12ヶ月）
        </h2>

        {monthlyStats.length > 0 ? (
          <div className="space-y-2">
            {/* グラフ本体 */}
            <div className="flex items-end justify-between gap-2 h-80 bg-gray-900 p-6 border-2 border-gray-700">
              {monthlyStats.map((monthly, index) => {
                const maxCount = Math.max(...monthlyStats.map(m => m.count), 1);
                const heightPercent = (monthly.count / maxCount) * 100;

                return (
                  <div key={monthly.month} className="flex-1 flex flex-col items-center gap-2">
                    {/* バーと数値 */}
                    <div className="relative w-full flex flex-col items-center">
                      <span className="text-yellow-300 font-black text-sm mb-1">{monthly.count}</span>
                      <div
                        className="w-full bg-gradient-to-t from-red-600 via-orange-500 to-yellow-400 transition-all duration-500 hover:opacity-80 cursor-pointer relative group"
                        style={{
                          height: `${Math.max(heightPercent, 5)}%`,
                          minHeight: '20px',
                        }}
                        title={`${monthly.month}: ${monthly.count}件 / ¥${monthly.payment.toLocaleString()}`}
                      >
                        {/* ホバー時のツールチップ */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-gray-800 text-yellow-300 text-xs font-bold px-3 py-2 border-2 border-yellow-400 whitespace-nowrap">
                            {monthly.month}<br/>
                            {monthly.count}件<br/>
                            ¥{monthly.payment.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 月ラベル */}
                    <p className="text-xs text-gray-400 font-bold text-center transform -rotate-45 origin-top-left mt-2 whitespace-nowrap">
                      {monthly.month}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 統計サマリー */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-700 p-4 border-2 border-gray-600 text-center">
                <p className="text-sm text-gray-400 font-bold mb-1">総発行数</p>
                <p className="text-2xl font-black text-yellow-300">
                  {monthlyStats.reduce((sum, m) => sum + m.count, 0)}件
                </p>
              </div>
              <div className="bg-gray-700 p-4 border-2 border-gray-600 text-center">
                <p className="text-sm text-gray-400 font-bold mb-1">月平均</p>
                <p className="text-2xl font-black text-yellow-300">
                  {Math.round(monthlyStats.reduce((sum, m) => sum + m.count, 0) / monthlyStats.length)}件
                </p>
              </div>
              <div className="bg-gray-700 p-4 border-2 border-gray-600 text-center">
                <p className="text-sm text-gray-400 font-bold mb-1">最高記録</p>
                <p className="text-2xl font-black text-yellow-300">
                  {Math.max(...monthlyStats.map(m => m.count))}件
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 font-bold text-lg">まだデータがありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
