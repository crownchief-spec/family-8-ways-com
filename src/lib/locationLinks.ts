/** 作品集 location 文字對應地區頁 slug（有建檔者） */
export const portfolioLocationToPage: Record<string, string> = {
  沖繩: 'okinawa',
  京都: 'kansai',
  台北: 'taipei',
  淡水: 'tamsui',
  宜蘭: 'yilan',
  台中: 'taichung',
};

export function hrefForPortfolioLocation(location: string) {
  const slug = portfolioLocationToPage[location];
  return slug ? `/locations/${slug}` : '/locations';
}
