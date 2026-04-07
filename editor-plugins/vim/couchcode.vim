" CouchCode.vim - Remote terminal access for Vim/Neovim
" Author: Ahmed Karam
" License: MIT
"
" Setup:
"   1. Install the CouchCode CLI: npm install -g couchcode-cli
"   2. Configure: couchcode config set serverUrl http://YOUR_IP:3847
"   3. Set API token: couchcode config set apiToken YOUR_TOKEN
"
" Commands:
"   :CouchCode           - Open interactive CouchCode terminal
"   :CouchCodeExec cmd   - Execute a command on CouchCode server
"   :CouchCodeSessions   - List active sessions
"   :CouchCodeStatus     - Show server status
"
" Keybindings (optional, add to your vimrc):
"   nnoremap <leader>cc :CouchCode<CR>
"   nnoremap <leader>ce :CouchCodeExec<Space>
"   nnoremap <leader>cs :CouchCodeSessions<CR>

if exists('g:loaded_couchcode')
  finish
endif
let g:loaded_couchcode = 1

" Configuration
let g:couchcode_server_url = get(g:, 'couchcode_server_url', 'http://localhost:3847')
let g:couchcode_token = get(g:, 'couchcode_token', '')
let g:couchcode_pin = get(g:, 'couchcode_pin', '')

function! s:GetCouchCodeCmd()
  " Try to find couchcode CLI
  let l:cmd = 'couchcode'
  if !executable(l:cmd)
    " Try npx
    let l:cmd = 'npx couchcode-cli'
  endif
  return l:cmd
endfunction

function! s:BuildArgs()
  let l:args = ''
  if g:couchcode_server_url != 'http://localhost:3847'
    let l:args .= ' --url ' . shellescape(g:couchcode_server_url)
  endif
  if g:couchcode_token != ''
    let l:args .= ' --token ' . shellescape(g:couchcode_token)
  endif
  if g:couchcode_pin != ''
    let l:args .= ' --pin ' . shellescape(g:couchcode_pin)
  endif
  return l:args
endfunction

" Open interactive terminal
function! CouchCodeConnect()
  let l:cmd = s:GetCouchCodeCmd() . ' connect' . s:BuildArgs()
  if has('nvim')
    " Neovim: use built-in terminal
    execute 'terminal ' . l:cmd
    startinsert
  else
    " Vim: use terminal feature
    execute 'terminal ++close ' . l:cmd
  endif
endfunction

" Execute a command
function! CouchCodeExec(cmd)
  let l:cmd = s:GetCouchCodeCmd() . ' exec' . s:BuildArgs() . ' ' . shellescape(a:cmd)
  if has('nvim')
    execute 'split | terminal ' . l:cmd
  else
    execute 'terminal ++close ' . l:cmd
  endif
endfunction

" List sessions
function! CouchCodeSessions()
  let l:cmd = s:GetCouchCodeCmd() . ' sessions' . s:BuildArgs()
  let l:output = system(l:cmd)
  echo l:output
endfunction

" Show status
function! CouchCodeStatus()
  let l:cmd = s:GetCouchCodeCmd() . ' status' . s:BuildArgs()
  let l:output = system(l:cmd)
  echo l:output
endfunction

" Commands
command! CouchCode call CouchCodeConnect()
command! -nargs=+ CouchCodeExec call CouchCodeExec(<q-args>)
command! CouchCodeSessions call CouchCodeSessions()
command! CouchCodeStatus call CouchCodeStatus()
