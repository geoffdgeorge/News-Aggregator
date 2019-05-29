const router = require('express').Router();
const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../models');

router.post('/comment', (req, res) => {
  const commentData = {
    username: req.body.username,
    message: req.body.message,
  };

  db.Comment.create(commentData)
    .then((dbComment) => {
      // Took a cue from this source to handle multiple promises for each comment: https://stackoverflow.com/questions/35381423/how-to-save-multiple-mongodb-collections-using-promise
      const promises = [
        new Promise((resolve, reject) => {
          db.Article.findOneAndUpdate(
            { _id: req.body.article_id },
            { $push: { comments: dbComment._id } },
            { new: true },
            (err, done) => {
              if (err) reject(err);
              else resolve(done);
            },
          );
        }),
        new Promise((resolve, reject) => {
          db.User.findOneAndUpdate(
            { username: req.body.username },
            { $push: { comments: dbComment._id } },
            { new: true },
            (err, done) => {
              if (err) reject(err);
              else resolve(done);
            },
          );
        }),
      ];
      return Promise.all(promises);
    })
    .then((dbUpdates) => {
      res.json(dbUpdates);
    })
    .catch((err) => {
      // If an error occurs, send it back to the client
      res.json(err);
    });
});

router.get('/comments/:id', (req, res) => {
  db.Article.find({ _id: req.params.id })
    .populate('comments')
    .then((dbUser) => {
      res.json(dbUser);
    })
    .catch((err) => {
      res.json(err);
    });
});

router.get('/articles', (req, res) => {
  axios
    .all([
      axios.get('https://thespool.net/'),
      axios.get('https://www.overthinkingit.com/'),
      axios.get('https://filmschoolrejects.com/'),
    ])
    .then(
      axios.spread((spoolRes, overthinkingRes, filmSchoolRes) => {
        const spool = cheerio.load(spoolRes.data);
        const over = cheerio.load(overthinkingRes.data);
        const fsr = cheerio.load(filmSchoolRes.data);

        spool('div .hover__handler').each(function (i, element) {
          const result = {};

          result.title = spool(this)
            .children('header')
            .children('a')
            .children('h1')
            .text();
          result.siteURL = 'thespool.net';
          result.linkURL = spool(this)
            .children('header')
            .children('a')
            .attr('href');
          result.imgURL = spool(this)
            .children('aside')
            .children('img')
            .attr('src');

          db.Article.findOne({ title: result.title }).then((searchedArticle) => {
            if (!searchedArticle) {
              db.Article.create(result)
                .then((dbArticle) => {
                  console.log(dbArticle);
                })
                .catch((err) => {
                  console.log(err);
                });
            }
          });
        });

        over('.post').each(function (i, element) {
          const result = {};

          result.title = over(this)
            .find('h2')
            .text();
          result.siteURL = 'overthinkingit.com';
          result.linkURL = over(this)
            .find('.entry--archive__title-link')
            .attr('href');
          result.imgURL = over(this)
            .find('img')
            .attr('src');

          db.Article.findOne({ title: result.title }).then((searchedArticle) => {
            if (!searchedArticle) {
              db.Article.create(result)
                .then((dbArticle) => {
                  console.log(dbArticle);
                })
                .catch((err) => {
                  console.log(err);
                });
            }
          });
        });

        fsr('article').each(function (i, element) {
          const result = {};

          result.title = fsr(this)
            .find('h3')
            .text();
          result.siteURL = 'filmschoolrejects.com';
          result.linkURL = fsr(this)
            .find('h3')
            .children('a')
            .attr('href');
          result.imgURL = fsr(this)
            .find('img')
            .attr('data-src');

          db.Article.findOne({ title: result.title }).then((searchedArticle) => {
            if (!searchedArticle) {
              db.Article.create(result)
                .then((dbArticle) => {
                  console.log(dbArticle);
                })
                .catch((err) => {
                  console.log(err);
                });
            }
          });
        });
      }),
    );
  // Send a message to the client
  res.send('Scrape Complete');
});

module.exports = router;
