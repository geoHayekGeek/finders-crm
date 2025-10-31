Param(
  [int]$Count = 40,
  [string]$Url = "http://localhost:10000/api/calendar/seed/reset"
)

if (-not $env:ADMIN_JWT) {
  Write-Error "ADMIN_JWT environment variable is not set. Please set it to an admin JWT token."
  exit 1
}

$Headers = @{ 
  Authorization = "Bearer $($env:ADMIN_JWT)" 
  "Content-Type" = "application/json"
}
$Body = @{ count = $Count } | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body $Body
  $response | ConvertTo-Json -Depth 5
} catch {
  Write-Error $_
  exit 1
}

