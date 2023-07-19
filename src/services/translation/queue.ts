import PQueue from "p-queue";

// TODO: handle error of queue overgrowth

const queue = new PQueue({
  concurrency: 1,
  timeout: 1000 * 60 * 10, // Wait for response maximum 10 minutes
  throwOnTimeout: true,
  intervalCap: 3,
  interval: 1000 * 60, // 3 RPM for free Open AI Plan // Note that using Open AI embeddings increases number of requests, so when using Open Ai insted of local vector store interval should be increased as well
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
