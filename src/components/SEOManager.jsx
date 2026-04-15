import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';

const SEOManager = () => {
    const { siteContent } = useBusiness();
    const location = useLocation();
    const seo = siteContent?.seo || {};

    useEffect(() => {
        // Master Switch Check: If the SEO engine is disabled in the CMS, do nothing.
        if (seo.engine_active === false) {
            console.log("[SEOManager] Engine is OFF. Skipping dynamic injections.");
            return;
        }

        const isConsulting = location.pathname.includes('/consultoria');
        const isHome = location.pathname === '/';
        const campaign = siteContent?.campaign || {};
        const isCampaignActive = isHome && campaign.active;
        
        // 1. Determine local values based on context
        // Priority: Campaign (if home/active) > CMS SEO > Defaults
        const title = isConsulting 
            ? (seo.consulting_title || 'Zeticas | Consultoría y Sostenibilidad')
            : (isCampaignActive && campaign.hero_title)
                ? campaign.hero_title
                : (seo.home_title || 'Zeticas | Sabores de la Sabana');
            
        const description = isConsulting
            ? (seo.consulting_description || 'Acompañamos a comunidades y organizaciones para fortalecer capacidades en equilibrio con la naturaleza.')
            : (isCampaignActive && campaign.hero_subtitle)
                ? campaign.hero_subtitle
                : (seo.home_description || 'Zeticas promueve un estilo de vida en armonía, consciente y diverso; recordando recetas tradicionales.');
            
        const ogImage = isConsulting
            ? (seo.og_image_consulting || '/assets/yarumo_tree.png')
            : (seo.og_image_home || '/logo.png');

        // 2. Update Document Title
        document.title = title;

        // 3. Update Meta Description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', description);

        // 4. Update Meta Keywords
        // Smart Fallback: If no explicit keywords, use the title words as hooks
        const finalKeywords = seo.keywords || (isConsulting ? seo.consulting_title : seo.home_title) || "";
        
        if (finalKeywords) {
            let metaKeywords = document.querySelector('meta[name="keywords"]');
            if (!metaKeywords) {
                metaKeywords = document.createElement('meta');
                metaKeywords.setAttribute('name', 'keywords');
                document.head.appendChild(metaKeywords);
            }
            metaKeywords.setAttribute('content', finalKeywords);
        }

        // 5. Update Open Graph Tags
        const updateOGTag = (property, content) => {
            let tag = document.querySelector(`meta[property="${property}"]`);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute('property', property);
                document.head.appendChild(tag);
            }
            tag.setAttribute('content', content);
        };

        updateOGTag('og:title', title);
        updateOGTag('og:description', description);
        updateOGTag('og:image', ogImage);
        updateOGTag('og:type', 'website');
        updateOGTag('og:url', window.location.href);

        // 6. JSON-LD Structured Data (Schema.org)
        const schemaId = 'zeticas-structured-data';
        let scriptTag = document.getElementById(schemaId);
        if (!scriptTag) {
            scriptTag = document.createElement('script');
            scriptTag.id = schemaId;
            scriptTag.type = 'application/ld+json';
            document.head.appendChild(scriptTag);
        }

        const schemaData = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Zeticas",
            "url": "https://www.zeticas.com",
            "logo": "https://www.zeticas.com/logo.png",
            "description": description,
            "sameAs": [
                "https://www.instagram.com/zeticas",
                "https://www.linkedin.com/company/zeticas"
            ]
        };

        scriptTag.text = JSON.stringify(schemaData);

    }, [location.pathname, seo, siteContent]);

    return null; // This component doesn't render anything visually
};

export default SEOManager;
