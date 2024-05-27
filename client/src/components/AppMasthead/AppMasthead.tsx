import './AppMasthead.css';
import { APP_NAME } from '../../services/constants.ts';
import CloseIcon from '@mui/icons-material/Close';
import { useCallback } from 'react';
import { IconButton } from '@mui/material';
import prImg from './img/pr.svg';

export function AppMasthead() {
    const handleClose = useCallback(() => {
        window.close();
    }, []);

    return (
        <div className="content-panel border masthead">
            <div className="header">
                <div>
                    <img src={prImg} className="header-image" alt="icon" />
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
