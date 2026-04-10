# Test API connectivity
$apiKey = $env:ANTHROPIC_API_KEY
$baseUrl = "https://api.kimi.com/coding/v1/messages"

Write-Host "Testing API: $baseUrl"
Write-Host "API Key length: $($apiKey.Length)"
Write-Host ""

try {
    $body = @{
        model = "kimi-for-coding"
        max_tokens = 100
        messages = @(@{ role = "user"; content = "Hello, respond with 'OK' only" })
    } | ConvertTo-Json -Depth 3

    $headers = @{
        "Content-Type" = "application/json"
        "x-api-key" = $apiKey
        "anthropic-version" = "2023-06-01"
    }

    Write-Host "Sending request..."
    $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $body -TimeoutSec 30
    
    Write-Host "✅ API Response successful!"
    Write-Host "Response: $($response.content[0].text)"
} catch {
    Write-Host "❌ API Error:"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Message: $($_.Exception.Message)"
    
    # Try to get response body
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
}
