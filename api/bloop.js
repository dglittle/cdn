module.exports = (req, res) => {
  res.json({
    body: req.body + 'hi!',
    query: req.query,
    cookies: req.cookies,
  })
}
