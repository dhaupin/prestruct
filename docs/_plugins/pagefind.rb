# Jekyll hook to run Pagefind after building the site
# This generates the search index from the built HTML files

Jekyll::Hooks.register :site, :post_write do |site|
  puts "\n==> Running Pagefind to generate search index..."
  
  # Get the destination directory (default: _site)
  destination = site.config["destination"] || "_site"
  
  # Run Pagefind to index the built site
  # Output goes to _site/pagefind/ by default
  system("cd '#{destination}' && ../pagefind/pagefind --source . 2>/dev/null")
  
  puts "==> Pagefind index generated in #{destination}/pagefind"
end