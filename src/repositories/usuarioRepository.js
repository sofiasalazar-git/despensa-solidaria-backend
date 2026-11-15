function crearUsuarioRepository(db) {
  return {
    buscarPorEmail(email) {
      return db.usuarios.findOne({ email });
    },
    async crear({ email, passwordHash, creadoEn }) {
      await db.usuarios.insertOne({
        _id: email,
        email,
        password_hash: passwordHash,
        created_at: creadoEn,
      });
    },
    async crearCuenta({ nombre, email, passwordHash, creadoEn }) {
      await db.usuarios.insertOne({
        _id: email,
        nombre,
        email,
        password_hash: passwordHash,
        created_at: creadoEn,
      });
    },
  };
}

module.exports = { crearUsuarioRepository };
