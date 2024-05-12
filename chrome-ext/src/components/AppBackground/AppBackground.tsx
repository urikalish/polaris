import { useEffect, useRef } from 'react';

export function AppBackground() {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        (videoRef.current! as HTMLVideoElement).playbackRate = 1;
    }, []);

    return (
        <video className="position--absolute" width="1067" controls={false} autoPlay={true} loop={true} playsInline={true} ref={videoRef}>
            <source src="/vid/purple-bokeh.mp4" />
        </video>
    );
}
