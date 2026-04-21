const num = 10.55;
console.log('es-CO:', num.toLocaleString('es-CO', { maximumFractionDigits: 1 }));
console.log('default:', num.toLocaleString(undefined, { maximumFractionDigits: 1 }));
