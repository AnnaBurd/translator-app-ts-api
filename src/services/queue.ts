import PQueue from "p-queue";

const queue = new PQueue({
  concurrency: 1,
  timeout: 1000 * 60,
  throwOnTimeout: true,
  intervalCap: 2,
  interval: 1000 * 40,
});

let count = 0;
queue.on("active", () => {
  console.log(
    `🦄 Working on item #${++count}.  Size: ${queue.size}  Pending: ${
      queue.pending
    }`
  );
});

export default queue;
