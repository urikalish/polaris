import './About.css';
import { APP_VERSION } from '../../services/constants.ts';

export function About() {
    return (
        <div className="about content-with-actions">
            <div className="content-panel border">
                <div className="about-form">
                    <div className="about-label">Version</div>
                    <div className="about-value">{APP_VERSION}</div>
                    <div className="about-label">Client</div>
                    <div className="about-value">React, Material, Vite</div>
                    <div className="about-label">Server</div>
                    <div className="about-value">Node, Express, Axios</div>
                </div>
            </div>
            <div className="actions-panel" />
        </div>
    );
}
