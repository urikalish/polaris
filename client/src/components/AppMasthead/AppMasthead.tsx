import './AppMasthead.css';
import { APP_NAME } from '../../services/constants.ts';
import CloseIcon from '@mui/icons-material/Close';
import { useCallback } from 'react';
import { IconButton } from '@mui/material';

export function AppMasthead() {
    const handleClose = useCallback(() => {
        window.close();
    }, []);

    return (
        <div className="content-panel masthead">
            <div className="header">
                <div>
                    {/*<img src="img/star128.png" className="header-image" alt="icon" />*/}
                    <span className="header-title">{APP_NAME}</span>
                </div>
                <div>
                    <IconButton onClick={handleClose}>
                        <CloseIcon />
                    </IconButton>
                </div>
            </div>
        </div>
    );
}
