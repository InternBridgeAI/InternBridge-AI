import re

with open('src/app/onboarding/page.tsx', 'r') as f:
    content = f.read()

# Replace role prioritization logic
old_logic = """            if (profile?.role) {
                effectiveRole = profile.role;
            } else if (urlRole) {
                effectiveRole = urlRole;
            } else if (localStorageRole) {
                effectiveRole = localStorageRole;
            } else if (metadataRole) {
                effectiveRole = metadataRole;
            }"""

new_logic = """            if (urlRole) {
                effectiveRole = urlRole;
            } else if (localStorageRole) {
                effectiveRole = localStorageRole;
            } else if (profile?.role && profile.role !== 'student') {
                effectiveRole = profile.role;
            } else if (metadataRole) {
                effectiveRole = metadataRole;
            } else if (profile?.role) {
                effectiveRole = profile.role;
            }"""

content = content.replace(old_logic, new_logic)

with open('src/app/onboarding/page.tsx', 'w') as f:
    f.write(content)

print("Updated onboarding page logic.")
