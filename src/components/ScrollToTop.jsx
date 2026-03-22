import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        // If there's no hash, scroll to top
        if (!hash) {
            window.scrollTo(0, 0);
        } else {
            // If there's a hash, the browser might handle it, but we wait a bit for content to render
            const id = hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [pathname, hash]);

    return null;
};

export default ScrollToTop;
