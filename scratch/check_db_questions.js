const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envUrl = "https://vakuhpkhebcswrcsuwsh.supabase.co";
const envKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZha3VocGtoZWJjc3dyY3N1d3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDI4NjIsImV4cCI6MjEwMDkxODg2Mn0.MfNFFrmN1r-0cAcx-kTZvpMwXKOosQW5GQFviRsLpM8";

const supabase = createClient(envUrl, envKey);

async function checkDatabase() {
  console.log("Fetching questions from Supabase...");
  const { data, error } = await supabase
    .from('coding_questions')
    .select('id, title, category, difficulty, points, description');

  if (error) {
    console.error("Error fetching questions:", error);
    return;
  }

  console.log(`Total questions in DB: ${data.length}`);
  
  // Count by category
  const counts = {};
  data.forEach(q => {
    counts[q.category] = (counts[q.category] || 0) + 1;
  });
  console.log("Counts by category:", counts);

  // Check some pattern question (e.g. ID 46)
  const q46 = data.find(q => q.id === 46);
  if (q46) {
    console.log("\n--- Pattern Question ID 46 ---");
    console.log("Title:", q46.title);
    console.log("Category:", q46.category);
    console.log("Description length:", q46.description ? q46.description.length : 0);
    console.log("Description (first 300 chars):", q46.description ? q46.description.substring(0, 300) : "empty");
    console.log("Description (contains pre tag?):", q46.description ? q46.description.includes("<pre") : false);
  } else {
    console.log("\nPattern Question ID 46 NOT found in DB!");
  }
}

checkDatabase();
