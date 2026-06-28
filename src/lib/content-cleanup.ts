export function cleanupBjjFanaticsContent(input: string) {
  let next = input;

  if (next.includes("Volume 1")) {
    for (let index = 1; index < 10; index += 1) {
      next = next.replaceAll(`Volume ${index}\n`, `Volume ${index}`);
      if (index > 1) {
        next = next.replaceAll(`Volume ${index}`, `\nVolume ${index}`);
      }
    }
  } else if (next.includes("Volume 01")) {
    for (let index = 1; index < 10; index += 1) {
      next = next.replaceAll(`Volume 0${index}\n`, `Volume 0${index}`);
      if (index > 1) {
        next = next.replaceAll(`Volume 0${index}`, `\nVolume 0${index}`);
      }
    }
  }

  return next.replaceAll("CHAPTER TITLE\nSTART TIME", "");
}
