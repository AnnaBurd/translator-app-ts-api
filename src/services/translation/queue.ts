import PQueue from "p-queue";

// TODO: handle error of queue overgrowth

const queue = new PQueue({
  concurrency: 1,
  timeout: 1000 * 60 * 30, // Wait for response 30 minutes
  throwOnTimeout: true,
  intervalCap: 1,
  interval: 1000 * 40,
});

let count = 0;
queue.on("active", () => {
  console.log(
    `🦄 Working on request #${++count}.  Queue size: ${queue.size}  Pending: ${
      queue.pending
    }`
  );
});

queue.on("error", (error) => {
  console.log("🦄 Error", error);
});

export default queue;
