

const supabaseUrl = 'https://vkoeeykvdtaztqceftlf.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb2VleWt2ZHRhenRxY2VmdGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDY5NDEsImV4cCI6MjA5MzEyMjk0MX0.fMylbdjIpdRhqlY5dqaZkbelG0x6ixK6a3rGrdF7bEU';

// Inicialização do cliente Supabase
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Torna o cliente acessível globalmente para os outros ficheiros (itens.js, dashboard.js, etc)
window.supabaseClient = _supabase;

console.log("Conexão com Supabase configurada para a agência MC4.");