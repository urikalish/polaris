import { useEffect, useRef } from 'react';

import './AppBackground.css';

export function AppBackground() {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        (videoRef.current! as HTMLVideoElement).playbackRate = 1;
    }, []);

    return (
        <video className="background-video position--absolute" width="1067" controls={false} autoPlay={true} loop={true} playsInline={true} ref={videoRef}>
            <source src="/vid/purple-bokeh.mp4" />
        </video>
    );
}
