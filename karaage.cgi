#!/usr/local/bin/gosh

(use text.html-lite)
(use file.util)
(use util.digest)
(use rfc.md5)
(use rfc.uri)
(use www.cgi)
(use text.tree)
(use sxml.serializer)

(define (counter-path username)
  (build-path "/usr/lib/cgi-bin/musubi" username "count"))

(define (get-count username)
  (define path (counter-path username))
  (if (file-exists? path)
    (x->integer (file->string path))
    (begin
      (make-directory* (build-path "/usr/lib/cgi-bin/musubi" username))
      (call-with-output-file path (cut format <> "0"))
      0)))

(define (increment-count username count)
  (define path (counter-path username))
  (call-with-output-file path (cut format <> "~a" (+ 1 count))))

(define (make-directory-name username count)
  (digest-hexify (digest-string <md5> (string-append username (number->string count)))))

(define (make-musubi-path username dirname)
  (build-path "/var/www/musubi" username dirname))

(define (make-www-path username dirname)
  (build-path "musubi" username dirname))

(define (make-musubi-directory username)
  (let* ((count (get-count username))
         (dirname (make-directory-name username count)))
    (increment-count username count)
    (let1 path (make-musubi-path username dirname)
      (if (file-exists? path)
        (make-musubi-directory username)
        (begin
          (make-directory* path)
          (sys-chmod path #o775)
          (let1 path-www (make-www-path username dirname)
            (values
             (uri-compose :scheme "ftp"  :host "localhost" :path path-www :userinfo "teruaki:pass")
             (uri-compose :scheme "http" :host "localhost" :path path-www))))))))

(define (parse-jid jid)
  "teruaki")

(define (display-musubi-sxml sxml)
  (write-tree `(,(cgi-header :content-type "text/xml")) (current-output-port))
  (srl:parameterizable
   sxml
   (current-output-port)
   '(method . xml)               ; XML
   '(indent . #f)                ; no indent
   '(omit-xml-declaration . #f)  ; append the XML declaretion
   '(standalone . yes)           ; add "standalone" declaretion
   '(version . "1.0")))

(define (w tree)
  (write-tree  tree
               (current-output-port)))

(define (main args)
  (cgi-main
    (lambda (params)
      (let* ((jid (cgi-get-parameter "jid" params
                                     :default "default@gmail.com"))
             (username (parse-jid jid)))
        (receive (musubi-ftp musubi-http) (make-musubi-directory username)
          `(musubi (@ (type "result") (from ,jid))
                   (ftp  ,musubi-ftp)
                   (http ,musubi-http)))))
    :output-proc display-musubi-sxml))


(define (make-echo-table params)
  (html:table
   :border 1
   (html:tr (html:th "Name") (html:th "Value"))
   (map (lambda (p)
          (html:tr
           (html:td (html-escape-string (car p)))
           (html:td (html-escape-string (x->string (cdr p))))))
        params)))

;; Local variables:
;; mode: inferior-gauche
;; end:
