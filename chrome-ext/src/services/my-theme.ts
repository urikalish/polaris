import { createTheme } from '@mui/material/styles';

export const myTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#f55',
        },
    },
    typography: {
        fontFamily:
            'Play, "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    },
});
