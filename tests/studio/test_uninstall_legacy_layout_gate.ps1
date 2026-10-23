#!/usr/bin/env pwsh
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0
# The ownership gate must still recognise layouts older installers left.
# Helpers are lifted out by AST because the uninstaller body writes to the registry.
# Run: pwsh -NoProfile -File tests/studio/test_uninstall_legacy_layout_gate.ps1

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path ([System.IO.Path]::Combine($PSScriptRoot, "..", ".."))).Path
$ps1Path = [System.IO.Path]::Combine($repoRoot, "scripts", "uninstall.ps1")

$failures = 0
function Check($name, $cond) {
    if ($cond) { Write-Host "  PASS  $name" }
    else { Write-Host "  FAIL  $name" -ForegroundColor Red; $script:failures++ }
}

$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($ps1Path, [ref]$tokens, [ref]$errors)
Check "uninstall.ps1 parses" ($null -eq $errors -or $errors.Count -eq 0)

# _IsStudioRoot calls the helpers below, so all of them must come across.
$allFns = $ast.FindAll({
        param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst]
    }, $true)
foreach ($name in @("_IsLAiMCmdShim", "_IsOwnerMarker", "_IsVenvDir", "_IsInstallerLeftoverName", "_IsStudioRoot")) {
    $fn = $allFns | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    if (-not $fn) {
        Write-Host "  FAIL  $name not found in uninstall.ps1" -ForegroundColor Red
        exit 1
    }
    . ([scriptblock]::Create($fn.Extent.Text))
}

$shimText = @"
@echo off
rem LAiM-studio-managed-launcher
"%~dp0..\LAiM_studio\Scripts\python.exe" -X utf8 -c "from LAiM_cli import app" %*
"@

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("LAiM-legacy-gate-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
try {
    function Make([string]$Name, [string[]]$Files) {
        $root = Join-Path $tmp $Name
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        foreach ($f in $Files) {
            $p = Join-Path $root $f
            New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($p)) -Force | Out-Null
            if ($f -eq "bin\LAiM.cmd") { Set-Content -LiteralPath $p -Value $shimText }
            else { Set-Content -LiteralPath $p -Value "x" }
        }
        Set-Content -LiteralPath (Join-Path $root "studio.db") -Value "chat history"
        return $root
    }

    # -ManagedDefaultRoot is passed for %USERPROFILE%\.LAiM\studio and for nothing else.
    Check "partial install: the root marker alone" `
        (_IsStudioRoot (Make "root-marker" @(".LAiM-studio-owned")) -ManagedDefaultRoot)
    Check "the root marker proves a custom root too" `
        (_IsStudioRoot (Make "custom-root-marker" @(".LAiM-studio-owned")))
    # A venv moved to another drive behind a junction is still an install and must stay removable.
    # The link refusal belongs in install.ps1's claim, where following one truncates the target.
    $markTarget = Join-Path $tmp "linked-marker-target.txt"
    Set-Content -LiteralPath $markTarget -Value "x"
    # New-Item -Path treats a backslash as an escape off Windows, so pass subdirectory and marker.
    foreach ($pair in @(@("", ".LAiM-studio-owned"), @("LAiM_studio", ".LAiM-studio-owned"),
                        @(".venv", ".LAiM-studio-owned"), @("share", "studio.conf"))) {
        $label = (($pair | Where-Object { $_ }) -join "/")
        $r = Make ("lm-" + ($label -replace '[^A-Za-z0-9]', '_')) @("keepme.txt")
        $at = $r
        if ($pair[0]) { $at = Join-Path $r $pair[0]; New-Item -ItemType Directory -Path $at -Force | Out-Null }
        $ok = $null
        try { $ok = New-Item -ItemType SymbolicLink -Path (Join-Path $at $pair[1]) -Target $markTarget -ErrorAction Stop } catch { $ok = $null }
        if ($ok) { Check "a relocated $label is still recognised" (_IsStudioRoot $r -ManagedDefaultRoot) }
        else { Write-Host "  SKIP  no symlink could be created for $label" }
    }
    $realVenvDir = Make "lm-real-venv" @(".LAiM-studio-owned", "pyvenv.cfg")
    $linkedDir = Make "lm-linked-dir" @("keepme.txt")
    $dl = $null
    foreach ($kind in @("Junction", "SymbolicLink")) {
        try {
            $dl = New-Item -ItemType $kind -Path (Join-Path $linkedDir "LAiM_studio") -Target $realVenvDir -ErrorAction Stop
            if ($dl -and -not [string]::IsNullOrWhiteSpace(@($dl.Target)[0])) { break }
        } catch { $dl = $null }
    }
    if ($dl -and -not [string]::IsNullOrWhiteSpace(@($dl.Target)[0])) {
        Check "a relocated venv directory is still recognised" (_IsStudioRoot $linkedDir -ManagedDefaultRoot)
        $preVenv = Make "lm-pre-venv" @("pyvenv.cfg", "Scripts\python.exe", "Scripts\LAiM.exe")
        $preRoot = Make "lm-linked-premarker" @("keepme.txt")
        $dl2 = $null
        foreach ($kind in @("Junction", "SymbolicLink")) {
            try {
                $dl2 = New-Item -ItemType $kind -Path (Join-Path $preRoot ".venv") -Target $preVenv -ErrorAction Stop
                if ($dl2 -and -not [string]::IsNullOrWhiteSpace(@($dl2.Target)[0])) { break }
            } catch { $dl2 = $null }
        }
        if ($dl2) { Check "a relocated pre-marker venv is still recognised" (_IsStudioRoot $preRoot -ManagedDefaultRoot) }
    } else {
        Write-Host "  SKIP  no reparse point could be created here"
    }
    Check "current layout (venv owner marker)" `
        (_IsStudioRoot (Make "cur-marker" @("LAiM_studio\.LAiM-studio-owned")) -ManagedDefaultRoot)
    Check "shim .exe" `
        (_IsStudioRoot (Make "cur-exe" @("bin\LAiM.exe")) -ManagedDefaultRoot)
    Check "shim .cmd alone, when a policy quarantined the .exe" `
        (_IsStudioRoot (Make "cur-cmd" @("bin\LAiM.cmd")) -ManagedDefaultRoot)

    Check "legacy .venv carrying our owner marker" `
        (_IsStudioRoot (Make "old-marker" @(".venv\.LAiM-studio-owned", ".venv\Scripts\python.exe")) -ManagedDefaultRoot)
    Check "legacy .venv carrying the LAiM console script" `
        (_IsStudioRoot (Make "old-cli" @(".venv\Scripts\python.exe", ".venv\Scripts\LAiM.exe")) -ManagedDefaultRoot)
    Check "pre-marker LAiM_studio venv carrying the LAiM console script" `
        (_IsStudioRoot (Make "pre-marker" @("LAiM_studio\Scripts\python.exe", "LAiM_studio\Scripts\LAiM.exe")) -ManagedDefaultRoot)
    Check "pre-marker venv whose LAiM.exe antivirus quarantined" `
        (_IsStudioRoot (Make "quarantined" @(".venv\Scripts\python.exe", ".venv\Lib\site-packages\LAiM_cli\__init__.py")) -ManagedDefaultRoot)
    Check "pre-marker venv proved by pyvenv.cfg alone" `
        (_IsStudioRoot (Make "cfg-only" @(".venv\pyvenv.cfg", ".venv\Scripts\LAiM.exe")) -ManagedDefaultRoot)

    Check "partial install: rollback copy only" `
        (_IsStudioRoot (Make "partial-rollback" @("LAiM_studio.rollback.20260908120000.4242\pyvenv.cfg")) -ManagedDefaultRoot)
    Check "partial install: invalid legacy venv only" `
        (_IsStudioRoot (Make "partial-invalid" @(".venv.invalid.20260908120000.4242\pyvenv.cfg")) -ManagedDefaultRoot)
    Check "partial install: rollback with a numeric suffix" `
        (_IsStudioRoot (Make "partial-suffix" @("LAiM_studio.rollback.20260908120000.4242.2\pyvenv.cfg")) -ManagedDefaultRoot)
    # install.ps1 claims the root before the uv cache, so the cache is not a sentinel.
    $uvOnly = Make "uvcache-only" @("notes.md")
    New-Item -ItemType Directory -Path (Join-Path $uvOnly "cache\uv") -Force | Out-Null
    Check "a uv cache with no root marker is refused" (-not (_IsStudioRoot $uvOnly -ManagedDefaultRoot))
    Check "the same at a custom root is refused" (-not (_IsStudioRoot $uvOnly))

    Check "a custom root with the venv owner marker" `
        (_IsStudioRoot (Make "custom-marker" @("LAiM_studio\.LAiM-studio-owned")))
    Check "a custom root with share\studio.conf" `
        (_IsStudioRoot (Make "custom-conf" @("share\studio.conf")))

    Check "a hand-made directory is refused" `
        (-not (_IsStudioRoot (Make "scratch" @("notes.md")) -ManagedDefaultRoot))
    Check "an ordinary project venv is refused" `
        (-not (_IsStudioRoot (Make "plain-venv" @(".venv\Scripts\python.exe", "notes.md")) -ManagedDefaultRoot))
    Check "a venv merely NAMED LAiM_studio is refused" `
        (-not (_IsStudioRoot (Make "named-venv" @("LAiM_studio\Scripts\python.exe")) -ManagedDefaultRoot))
    Check "somebody else's bin\LAiM.cmd is refused" `
        (-not (_IsStudioRoot (Make "foreign-cmd" @("bin\python.exe")) -ManagedDefaultRoot))
    # pip writes Scripts\LAiM.exe into any venv with the wheel.
    Check "a project venv with LAiM pip-installed is refused as a custom root" `
        (-not (_IsStudioRoot (Make "custom-project" @(".venv\Scripts\python.exe", ".venv\Scripts\LAiM.exe", "pyproject.toml"))))
    Check "that project's site-packages is refused as a custom root too" `
        (-not (_IsStudioRoot (Make "custom-pkg" @(".venv\Scripts\python.exe", ".venv\Lib\site-packages\LAiM_cli\__init__.py"))))
    Check "a partial-install leftover is refused at a custom root" `
        (-not (_IsStudioRoot (Make "custom-partial" @(".venv.invalid.20260908120000.4242\pyvenv.cfg"))))
    Check "a FILE named like a leftover is refused" `
        (-not (_IsStudioRoot (Make "leftover-file" @(".venv.invalid.20260908120000.4242")) -ManagedDefaultRoot))
    $emptyLeftover = Make "leftover-empty" @()
    New-Item -ItemType Directory -Path (Join-Path $emptyLeftover "LAiM_studio.rollback.20260908120000.4242") -Force | Out-Null
    Check "an empty directory named like a leftover is refused" `
        (-not (_IsStudioRoot $emptyLeftover -ManagedDefaultRoot))
    Check "a leftover-named directory holding the user's own files is refused" `
        (-not (_IsStudioRoot (Make "leftover-user" @(".venv.invalid.20260908120000.4242\notes.md")) -ManagedDefaultRoot))
    Check "a console script with no venv around it is refused" `
        (-not (_IsStudioRoot (Make "loose-exe" @(".venv\Scripts\LAiM.exe")) -ManagedDefaultRoot))
    Check "a site-packages tree with no interpreter is refused" `
        (-not (_IsStudioRoot (Make "loose-pkg" @("LAiM_studio\Lib\site-packages\LAiM\__init__.py")) -ManagedDefaultRoot))
    Check "a rollback-named venv outside the installer's format is refused" `
        (-not (_IsStudioRoot (Make "leftover-freeform" @("LAiM_studio.rollback.user-data\pyvenv.cfg")) -ManagedDefaultRoot))
    Check "an invalid-venv name outside the installer's format is refused" `
        (-not (_IsStudioRoot (Make "leftover-backup" @(".venv.invalid.backup\pyvenv.cfg")) -ManagedDefaultRoot))
    Check "an invalid-venv name with a rollback-style suffix is refused" `
        (-not (_IsStudioRoot (Make "leftover-suffixed-invalid" @(".venv.invalid.20260908120000.4242.2\pyvenv.cfg")) -ManagedDefaultRoot))
    Check "a rollback name with a non-numeric pid is refused" `
        (-not (_IsStudioRoot (Make "leftover-badpid" @("LAiM_studio.rollback.20260908120000.mine\pyvenv.cfg")) -ManagedDefaultRoot))
    # \d matches every Unicode decimal digit; install.ps1 only ever writes ASCII.
    $arabicDigits = -join (0..13 | ForEach-Object { [char](0x0660 + ($_ % 10)) })
    Check "a leftover stamp in non-ASCII digits is refused" `
        (-not (_IsStudioRoot (Make "leftover-unicode" @(".venv.invalid.$arabicDigits.4242\pyvenv.cfg")) -ManagedDefaultRoot))
    # "time" is install.sh's date(1) fallback; install.ps1 always formats yyyyMMddHHmmss.
    Check "install.sh's time fallback is not a Windows name" `
        (-not (_IsStudioRoot (Make "leftover-time" @(".venv.invalid.time.4242\pyvenv.cfg")) -ManagedDefaultRoot))
    $linkRoot = Make "leftover-link" @("keepme.txt")
    $realVenv = Make "somebodys-venv" @("pyvenv.cfg")
    $made = $null
    foreach ($kind in @("Junction", "SymbolicLink")) {
        try {
            $made = New-Item -ItemType $kind -Path (Join-Path $linkRoot "LAiM_studio.rollback.20260908120000.4242") -Target $realVenv -ErrorAction Stop
            if ($made -and -not [string]::IsNullOrWhiteSpace(@($made.Target)[0])) { break }
        } catch { $made = $null }
    }
    if ($made -and -not [string]::IsNullOrWhiteSpace(@($made.Target)[0])) {
        Check "a linked leftover is refused" (-not (_IsStudioRoot $linkRoot -ManagedDefaultRoot))
    } else {
        Write-Host "  SKIP  no reparse point could be created here"
    }
    $foreign = Make "foreign-shim" @()
    New-Item -ItemType Directory -Path (Join-Path $foreign "bin") -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $foreign "bin\LAiM.cmd") -Value "@echo off`r`npython -m mytool %*`r`n"
    Check "a bin\LAiM.cmd without the trampoline is refused" (-not (_IsStudioRoot $foreign -ManagedDefaultRoot))
    Check "a missing path is refused" (-not (_IsStudioRoot (Join-Path $tmp "does-not-exist") -ManagedDefaultRoot))
    Check "an empty path is refused" (-not (_IsStudioRoot "" -ManagedDefaultRoot))

    # Claiming a workspace the gate would refuse hands it to the uninstaller.
    $installPs1 = [System.IO.Path]::Combine($repoRoot, "install.ps1")
    $ie = $null; $it = $null
    $iast = [System.Management.Automation.Language.Parser]::ParseFile($installPs1, [ref]$it, [ref]$ie)
    $ifns = $iast.FindAll({
            param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst]
        }, $true)
    # Write-StudioRootOwnerMarker calls Test-StudioPlainFile, or every claim below is vacuous.
    foreach ($name in @("Test-StudioPlainFile", "Write-StudioRootOwnerMarker")) {
        $fn = $ifns | Where-Object { $_.Name -eq $name } | Select-Object -First 1
        if (-not $fn) {
            Write-Host "  FAIL  $name not found in install.ps1" -ForegroundColor Red
            $script:failures++
        } else {
            . ([scriptblock]::Create($fn.Extent.Text))
        }
    }
    function ClaimCheck([string]$Name, [bool]$WantClaimed, [string]$Mode, [string[]]$Files) {
        $root = Join-Path $tmp ("claim-" + $Name)
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        foreach ($f in $Files) {
            $p = Join-Path $root $f
            New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($p)) -Force | Out-Null
            Set-Content -LiteralPath $p -Value "x"
        }
        $StudioRedirectMode = $Mode
        Write-StudioRootOwnerMarker -Root $root
        $claimed = Test-Path -LiteralPath (Join-Path $root ".LAiM-studio-owned") -PathType Leaf
        Check $Name ($claimed -eq $WantClaimed)
    }
    ClaimCheck "the default root, always" $true "default" @("notes.md")
    ClaimCheck "an empty custom root" $true "env" @()
    ClaimCheck "a custom root already carrying our marker" $true "env" @("LAiM_studio\.LAiM-studio-owned")
    ClaimCheck "a custom root with share\studio.conf" $true "env" @("share\studio.conf")
    ClaimCheck "somebody's workspace" $false "env" @("pyproject.toml")
    ClaimCheck "somebody's workspace with a venv of their own" $false "env" @("LAiM_studio\pyvenv.cfg")
    # This list authorizes a delete, and any file can be named bin\LAiM.exe.
    ClaimCheck "a workspace holding a plain bin\LAiM.exe" $false "env" @("bin\LAiM.exe", "notes.txt")
    foreach ($pair in @(@("share", "studio.conf"), @("LAiM_studio", ".LAiM-studio-owned"))) {
        $wroot = Join-Path $tmp ("claim-linked-" + $pair[0])
        $wreal = Join-Path $tmp ("claim-linked-" + $pair[0] + "-real")
        New-Item -ItemType Directory -Path $wroot -Force | Out-Null
        New-Item -ItemType Directory -Path $wreal -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $wreal $pair[1]) -Value "x"
        Set-Content -LiteralPath (Join-Path $wroot "notes.txt") -Value "mine"
        $dl = $null
        foreach ($kind in @("Junction", "SymbolicLink")) {
            try {
                $dl = New-Item -ItemType $kind -Path (Join-Path $wroot $pair[0]) -Target $wreal -ErrorAction Stop
                if ($dl -and -not [string]::IsNullOrWhiteSpace(@($dl.Target)[0])) { break }
            } catch { $dl = $null }
        }
        if ($dl -and -not [string]::IsNullOrWhiteSpace(@($dl.Target)[0])) {
            $StudioRedirectMode = "env"
            Write-StudioRootOwnerMarker -Root $wroot
            Check "a linked $($pair[0]) is not ownership proof" `
                (-not (Test-Path -LiteralPath (Join-Path $wroot ".LAiM-studio-owned") -PathType Leaf))
        }
    }
    # Test-Path follows a link named like our marker, which would skip the emptiness test.
    $lm = Join-Path $tmp "claim-linked-marker"
    New-Item -ItemType Directory -Path $lm -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $lm "notes.txt") -Value "mine"
    $lmTarget = Join-Path $tmp "claim-linked-marker-target.txt"
    Set-Content -LiteralPath $lmTarget -Value "x"
    $lmLink = $null
    try {
        $lmLink = New-Item -ItemType SymbolicLink -Path (Join-Path $lm ".LAiM-studio-owned") -Target $lmTarget -ErrorAction Stop
    } catch { $lmLink = $null }
    if ($lmLink) {
        $StudioRedirectMode = "env"
        Write-StudioRootOwnerMarker -Root $lm
        $still = Get-Item -LiteralPath (Join-Path $lm ".LAiM-studio-owned") -Force
        Check "a linked marker is not read as proof, and is left as it was" `
            ((($still.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0))
    } else {
        Write-Host "  SKIP  no symlink could be created here"
    }
    $twice = Join-Path $tmp "claim-twice"
    New-Item -ItemType Directory -Path $twice -Force | Out-Null
    $StudioRedirectMode = "default"
    Write-StudioRootOwnerMarker -Root $twice
    Set-Content -LiteralPath (Join-Path $twice ".LAiM-studio-owned") -Value "first" -NoNewline
    Write-StudioRootOwnerMarker -Root $twice
    Check "a second claim leaves a valid marker alone" `
        ((Get-Content -LiteralPath (Join-Path $twice ".LAiM-studio-owned") -Raw) -eq "first")
    # Test-DirectoryHasEntries is defined below the first call site, so the test must be inline.
    Check "the claim does not depend on Test-DirectoryHasEntries" `
        (-not ((($ifns | Where-Object { $_.Name -eq "Write-StudioRootOwnerMarker" } | Select-Object -First 1).Extent.Text) -match "Test-DirectoryHasEntries"))

    # WriteAllText would follow a link at the marker path and truncate the target.
    $linkClaim = Join-Path $tmp "claim-link"
    New-Item -ItemType Directory -Path $linkClaim -Force | Out-Null
    $target = Join-Path $tmp "precious.txt"
    Set-Content -LiteralPath $target -Value "precious"
    $linked = $null
    try {
        $linked = New-Item -ItemType SymbolicLink -Path (Join-Path $linkClaim ".LAiM-studio-owned") -Target $target -ErrorAction Stop
    } catch { $linked = $null }
    if ($linked) {
        $StudioRedirectMode = "default"
        Write-StudioRootOwnerMarker -Root $linkClaim
        Check "a linked marker path does not truncate its target" ((Get-Content -LiteralPath $target -Raw).Trim() -eq "precious")
    } else {
        Write-Host "  SKIP  no symlink could be created here"
    }

    $installText = Get-Content -LiteralPath $installPs1 -Raw
    $guard = [regex]::Match($installText, "(?s)why: matching guard to the \.venv branch below.*?Move it aside or choose an empty").Value
    Check "install.ps1 has an env-mode replacement guard" ($guard.Length -gt 0)
    Check "and it reads the root marker" `
        ($guard -match [regex]::Escape('Join-Path $StudioHome ".LAiM-studio-owned"'))
    Check "and through Test-StudioPlainFile, not Test-Path" `
        ($guard -match [regex]::Escape('Test-StudioPlainFile -Path (Join-Path $StudioHome ".LAiM-studio-owned")'))
} finally {
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

if ($failures -gt 0) { Write-Host "$failures check(s) failed" -ForegroundColor Red; exit 1 }
Write-Host "all checks passed"
