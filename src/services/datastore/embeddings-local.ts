// import "@tensorflow/tfjs-node-gpu";
import "@tensorflow/tfjs-node";
import { TensorFlowEmbeddings } from "langchain/embeddings/tensorflow";

export const embeddings = new TensorFlowEmbeddings();
