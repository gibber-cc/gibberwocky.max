# switch to gh-pages branch
git checkout gh-pages
# merge in the html folder
git checkout master html/*
# commit it
git commit -m 'merged html'
# update remote
git pull && git push
# back to master
git checkout master
