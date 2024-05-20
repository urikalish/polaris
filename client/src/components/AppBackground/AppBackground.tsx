import { useEffect, useRef } from 'react';

import './AppBackground.css';

type AppBackgroundProps = {
    uiTheme: string | undefined;
};

export function AppBackground({ uiTheme }: AppBackgroundProps) {
    const bokehRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        (bokehRef.current! as HTMLVideoElement).playbackRate = 1;
    }, []);

    return (
        <video
            className={`background-video position--absolute ${uiTheme === 'bokeh' ? '' : 'display--none'}`}
            width="1067"
            controls={false}
            autoPlay={true}
            loop={true}
            playsInline={true}
            ref={bokehRef}
        >
            <source src="/vid/bokeh.mp4" />
        </video>
    );
}
