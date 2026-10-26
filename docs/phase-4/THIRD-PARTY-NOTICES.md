# Local model attribution

LostLink uses Xenova/all-MiniLM-L6-v2, ONNX quantization of sentence-transformers/all-MiniLM-L6-v2 (MiniLM), under Apache License 2.0. Model revision: 751bff37182d3f1213fa05d7196b954e230abad9. LostLink does not modify the supplied weights; it runs the quantized model with mean pooling and normalization.

- Model and license declaration: https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/751bff37182d3f1213fa05d7196b954e230abad9
- Upstream model card/authors: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- License text: LICENSE-MINILM.txt in this directory; setup copies it and this notice into the packaged model directory.
- Transformers.js and ONNX Runtime retain their own license files in their npm packages, included with the runtime dependencies.
