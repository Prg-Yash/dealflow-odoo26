export type TimePeriod = "7_days" | "30_days" | "this_quarter" | "ytd" | "all_time";

export const filterByTimePeriod = <T extends Record<string, any>>(
  items: T[],
  dateField: keyof T,
  period: TimePeriod
): T[] => {
  if (period === "all_time") return items;

  const now = new Date();
  
  return items.filter((item) => {
    const itemDate = new Date(item[dateField]);
    
    // Default to true if the date is invalid to avoid dropping weird mock data.
    if (isNaN(itemDate.getTime())) return true;

    switch (period) {
      case "7_days": {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return itemDate >= sevenDaysAgo;
      }
      case "30_days": {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return itemDate >= thirtyDaysAgo;
      }
      case "this_quarter": {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
        return itemDate >= startOfQuarter;
      }
      case "ytd": {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return itemDate >= startOfYear;
      }
      default:
        return true;
    }
  });
};
