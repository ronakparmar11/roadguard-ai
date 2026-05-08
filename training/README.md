# YOLOv8 Pothole Detection – Training

This folder contains the configuration and instructions used to fine-tune the YOLOv8s model on a pothole-detection dataset using Nebius Cloud GPUs.

## Training Command

The model was trained for 100 epochs using the Ultralytics CLI:

```bash
yolo detect train \
    model=yolov8s.pt \
    data=data.yaml \
    epochs=100 \
    imgsz=640 \
    batch=8
```

## Explanation:

- `epochs=100` means that the model will run 100 training cycles over the entire dataset
- `imgsz` resizes all the images to 640×640 before training
- `batch=8` means 8 images are processed together per training step and multiple batches make up one epoch

So if you have 600 images and `batch=8` then 600/8 = 75 batches, so each `epoch` would have 75 batches and each batch would process 8 images together. Batches are a hardware optimization because without batches, then we would need to process all 600 images at once which would affect the GPU memory if it's a big dataset.

## Dataset
The `data.yaml` is the file format that `yolo` can read, the dataset that was used to train this model can be found in huggingface:

[Pothole dataset](https://huggingface.co/datasets/Ryukijano/Pothole-detection-Yolov8)

## Model

The model was also uploaded to huggingface which can be found here:

[Yolov8 pothole detection model](https://huggingface.co/peterhdd/pothole-detection-yolov8)

# Sample Predictions

Here are some predictions from the model after it was generated:

![dataset prediction](image.png)