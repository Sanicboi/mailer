export const wait = async (s: number) =>
  await new Promise((resolve, reject) => setTimeout(resolve, s * 1000));
