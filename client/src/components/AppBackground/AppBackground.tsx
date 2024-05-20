import { useEffect, useRef } from 'react';

import './AppBackground.css';
import { ConfigObj } from '../../services/config.ts';

type AppBackgroundProps = {
    config: ConfigObj | null;
};

export function AppBackground({ config }: AppBackgroundProps) {
    const bokehRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        (bokehRef.current! as HTMLVideoElement).playbackRate = 1;
    }, []);

    return (
        <video
            className={`background-video position--absolute ${config?.uiTheme === 'bokeh' ? '' : 'display--none'}`}
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
