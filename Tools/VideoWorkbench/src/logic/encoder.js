/**
 * WebCodecs Video Encoder Logic
 * Uses VideoEncoder API to re-encode video files.
 * Note: This is a simplified implementation focusing on logic structure.
 * Full muxing (creating MP4/WebM container) requires a WASM library like ffmpeg.wasm or mp4-muxer.
 * For this "non-AI standalone" requirement, we assume a raw stream or simple muxer approach if possible, 
 * but since pure JS WebCodecs output is raw chunks, we will simulate the "muxing" part or just output key stats for this prototype 
 * unless we import a muxer library.
 * 
 * Update: To keep it standalone and simple, we will implement the Encoding Pipeline and report progress, 
 * but for the actual file output, we would need to bundle `mp4box.js` or similar. 
 * I will implement the core encoding loop.
 */

export class VideoConverter {
    constructor(onProgress, onComplete, onError) {
        this.onProgress = onProgress || (() => { });
        this.onComplete = onComplete || (() => { });
        this.onError = onError || (() => { });
        this.encoder = null;
    }

    async start(file, config = { bitrate: 2_500_000 }) { // Default 2.5Mbps
        try {
            console.log("Starting real conversion for:", file.name);

            const video = document.createElement('video');
            video.muted = true;
            video.src = URL.createObjectURL(file);
            video.playsInline = true;

            await new Promise((resolve, reject) => {
                video.onloadedmetadata = () => resolve();
                video.onerror = (e) => reject(new Error("Video load error"));
            });

            // Calculate target dimensions (Maintain Aspect Ratio)
            // Use provided config.height (from dropdown) or default to 1080
            let targetHeight = config.height || 1080;

            let width = video.videoWidth;
            let height = video.videoHeight;

            // Only resize if source is larger than target OR if we want to force download scaling
            // For this tool, let's allow scaling down.
            if (height > targetHeight) {
                const ratio = width / height;
                height = targetHeight;
                width = Math.round(height * ratio);
                // Ensure even numbers for codecs
                if (width % 2 !== 0) width++;
                if (height % 2 !== 0) height++;
            }

            console.log(`Target Resolution: ${width}x${height} @ ${config.bitrate} bps`);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Find supported mime type
            const types = [
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/mp4;codecs=avc1.42E01E' // Safari/Chrome support
            ];
            let mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
            console.log("Using MimeType:", mimeType);

            // Create streams
            // Canvas stream for video
            const canvasStream = canvas.captureStream(30); // 30fps target

            // Video stream for audio (if exists)
            // Note: captureStream() on video element might be cross-origin restricted if not local blob? 
            // Blob URL is same-origin usually.
            let combinedStream;
            try {
                // Try capturing audio from video element
                // NOTE: video.captureStream() is not supported in all browsers perfectly.
                // Fallback: Just video if audio fails.
                const videoStream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
                const audioTracks = videoStream.getAudioTracks();

                if (audioTracks.length > 0) {
                    canvasStream.addTrack(audioTracks[0]);
                }
                combinedStream = canvasStream;
            } catch (e) {
                console.warn("Audio capture failed or not supported, proceeding with video only.", e);
                combinedStream = canvasStream;
            }

            const recorder = new MediaRecorder(combinedStream, {
                mimeType: mimeType,
                videoBitsPerSecond: config.bitrate
            });

            const chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);

                this.onComplete({
                    url: url,
                    size: blob.size,
                    time: "N/A"
                });

                // Cleanup
                URL.revokeObjectURL(video.src);
                video.remove();
                canvas.remove();
            };

            recorder.start();

            // Play and Draw Loop
            await video.play();

            const totalDuration = video.duration;

            const draw = () => {
                if (video.paused || video.ended) {
                    if (video.ended && recorder.state !== 'inactive') {
                        recorder.stop();
                    }
                    return;
                }

                ctx.drawImage(video, 0, 0, width, height);

                // Progress
                const percent = Math.round((video.currentTime / totalDuration) * 100);
                this.onProgress(percent);

                requestAnimationFrame(draw);
            };

            draw();

        } catch (err) {
            this.onError(err);
        }
    }
}
