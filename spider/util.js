module.exports = {

  getMilliSecond: (timestring) => {
    if (!timestring) return null;
    const [, num, type] = timestring.match(/(\d+)(\w)/);
    let modifier = 1;
    switch (type) {
      case 'ms': break;
      case 's': modifier *= 1000; break;
      case 'm': modifier *= 60 * 1000; break;
      case 'h': modifier *= 3600 * 1000; break;
      case 'd': modifier *= 24 * 3600 * 1000; break;
      default:
        throw new Error(`[Util]: GetMilliSecond - unknown interval type of "${timestring}"`);
    }
    return parseFloat(num) * modifier;
  }

};
