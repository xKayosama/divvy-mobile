export const floatingTabBar = {
  height: 68,
  margin: 20,
  minBottom: 8,
  contentGap: 24,
} as const;

export function tabBarBottomOffset(bottomInset: number) {
  return Math.max(bottomInset - 10, floatingTabBar.minBottom);
}

export function tabContentBottomInset(bottomInset: number) {
  return floatingTabBar.height + tabBarBottomOffset(bottomInset) + floatingTabBar.contentGap;
}
