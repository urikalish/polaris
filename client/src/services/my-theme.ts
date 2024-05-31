import { createTheme } from '@mui/material/styles';
import { Theme } from '@mui/material/styles/createTheme';

const typography = {
    fontFamily:
        'Play, "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
};
export const myThemes: { [index: string]: Theme } = {
    light: createTheme({
        palette: {
            mode: 'light',
            primary: {
                main: '#f55',
            },
        },
        typography,
    }),
    dark: createTheme({
        palette: {
            mode: 'dark',
            primary: {
                main: '#f55',
            },
        },
        typography,
    }),
    bokeh: createTheme({
        palette: {
            mode: 'dark',
            primary: {
                main: '#f55',
            },
        },
        typography,
    }),
};
