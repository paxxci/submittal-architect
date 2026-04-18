import sys
with open('frontend/src/components/AdminMasterAdmin.jsx', 'r') as f:
    text = f.read()

t1 = text.split('{/* 2. Vendors on the Job */}')[0]
vendors = '{/* 2. Vendors on the Job */}' + text.split('{/* 2. Vendors on the Job */}')[1].split('{/* 3. Preferred Search Sites */}')[0]
preferred = '{/* 3. Preferred Search Sites */}' + text.split('{/* 3. Preferred Search Sites */}')[1].split('            </div>\n\n        </div>')[0]
t2 = '            </div>\n\n        </div>' + text.split('            </div>\n\n        </div>')[1]

new_text = t1 + preferred + '\n' + vendors + t2

with open('frontend/src/components/AdminMasterAdmin.jsx', 'w') as f:
    f.write(new_text)

print("Swap executed")
