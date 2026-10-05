import react from '@vitejs/plugin-react';
export default { plugins: [react()], build: { outDir: '../public', emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'assets/app.js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/app[extname]' } } } };
