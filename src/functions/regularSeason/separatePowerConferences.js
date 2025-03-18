export const separatePowerConferences = (confObject, powerConfArr) => {
  const otherConfArr = [];

  for (const key in confObject) {
    if (powerConfArr.includes(key)) {
    } else {
      otherConfArr.push(key);
    }
  }

  return otherConfArr;
};
