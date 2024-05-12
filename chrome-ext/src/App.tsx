import { AppBackground } from './components/AppBackground/AppBackground.tsx';
import { AppMasthead } from './components/AppMasthead/AppMasthead.tsx';

function App() {
    return (
        <div className="height--100 overflow--hidden">
            <AppBackground />
            <AppMasthead />
        </div>
    );
}

export default App;
