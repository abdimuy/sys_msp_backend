export const groupBy = (arr: any[], fn: Function, fnAdd: Function): any[] => {
  return arr.reduce((acc: any, item: any) => {
    const key = fn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    // acc[key].push(item);
    acc[key].push(fnAdd(item));
    return acc;
  }, {});
};
