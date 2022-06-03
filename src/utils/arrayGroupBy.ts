export const groupBy = (arr: any[], fn: Function): any[] => {
  return arr.reduce((acc: any, item: any) => {
    const key = fn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
};
