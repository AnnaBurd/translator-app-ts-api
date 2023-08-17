import PQueue from "p-queue";

// TODO: handle error of queue overgrowth

const queue = new PQueue({
  concurrency: 10,
  timeout: 1000 * 60 * 10, // Wait for response maximum 10 minutes
  throwOnTimeout: true,
  intervalCap: 20,
  interval: 1000 * 60, // ~20 RPM
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
  console.log("🦄 Queue Error", error);
});

export default queue;
