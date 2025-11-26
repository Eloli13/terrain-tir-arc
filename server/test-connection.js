require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

console.log('🔍 Test de connexion PostgreSQL...');
console.log('Configuration:');
console.log('  Host:', process.env.DB_HOST);
console.log('  Port:', process.env.DB_PORT);
console.log('  Database:', process.env.DB_NAME);
console.log('  User:', process.env.DB_USER);
console.log('  Password:', process.env.DB_PASSWORD ? '***défini***' : '❌ NON DÉFINI');

pool.query('SELECT NOW() as time, current_database() as db, current_user as user', (err, res) => {
  if (err) {
    console.error('❌ Erreur de connexion:', err.message);
    console.error('\n💡 Vérifiez que:');
    console.error('  1. PostgreSQL est démarré');
    console.error('  2. L\'utilisateur "tir_arc_user" existe');
    console.error('  3. Le mot de passe dans .env correspond');
    console.error('  4. La base "terrain_tir_arc" existe');
  } else {
    console.log('\n✅ Connexion réussie!');
    console.log('  Heure serveur:', res.rows[0].time);
    console.log('  Base de données:', res.rows[0].db);
    console.log('  Utilisateur:', res.rows[0].user);
  }
  pool.end();
});
