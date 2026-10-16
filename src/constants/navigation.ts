export const groupTabBar = {
  height: 64,
  raise: 30,
  contentGap: 12,
} as const;

export function tabBarBottomPadding(bottomInset: number) {
  return Math.max(bottomInset - 8, 8);
}

export function tabContentBottomInset(bottomInset: number) {
  return groupTabBar.height + tabBarBottomPadding(bottomInset) + groupTabBar.raise + groupTabBar.contentGap;
}
