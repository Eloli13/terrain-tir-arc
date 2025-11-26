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
console.log('  Base de données:', process.env.DB_NAME);
console.log('  Utilisateur:', process.env.DB_USER);
console.log('  Mot de passe:', process.env.DB_PASSWORD ? '***défini***' : '❌ NON DÉFINI');

pool.query('SELECT NOW() as time, current_database() as db, current_user as user', (err, res) => {
  if (err) {
    console.error('❌ Erreur de connexion:', err.message);
    console.error('\n💡 Vérifiez que:');
    console.error('  1. PostgreSQL est démarré');
    console.error('  2. L\'utilisateur "tir_arc_user" existe');
    console.error('  3. Le mot de passe dans .env correspond');
    console.error('  4. La base "terrain_tir_arc" existe');
    console.error('\n📝 Pour créer l\'utilisateur et la base:');
    console.error('  Ouvrez SQL Shell (psql) et exécutez:');
    console.error('  CREATE USER tir_arc_user WITH PASSWORD \'votre_mot_de_passe\';');
    console.error('  CREATE DATABASE terrain_tir_arc OWNER tir_arc_user;');
    console.error('  GRANT ALL PRIVILEGES ON DATABASE terrain_tir_arc TO tir_arc_user;');
  } else {
    console.log('\n✅ Connexion réussie!');
    console.log('  Heure serveur:', res.rows[0].time);
    console.log('  Base de données:', res.rows[0].db);
    console.log('  Utilisateur:', res.rows[0].user);
    console.log('\n🎉 Vous pouvez maintenant lancer:');
    console.log('  node scripts/setup-database.js');
  }
  pool.end();
});
