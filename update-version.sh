#!/bin/bash

# Usage to reset a version number from e.g. 2.7.1 to 2.7.0
# In root folder of branch code: ./resetReleaseVersions.sh 2.7.1 2.7.0

# Source version eg. 2.6.0
version="$1"
# Target version eg. 2.7.0-RC0
new_version="$2"
# Target version main number eg. 2.7.0
new_version_main="0"
# Target version main number without separator eg. 270
new_version_main_nopoint="0"
# Target version minor version number eg. RC0
sub_version="0"

function showUsage 
{
  echo -e "\nThis script is used to reset a version number from e.g. 2.7.1 to 2.7.0" 
  echo
  echo -e "Usage: ./`basename $0 $1` actual_version next_version"
  echo
  echo -e "Example to update file versions from 2.7.0 to 2.7.1:"
  echo -e "\t./`basename $0 $1` 2.7.0 2.7.1"
  echo
}

if [ "$1" = "-h" ] 
then
	showUsage
	exit
fi

if [ $# -ne 2 ]
then
  showUsage
  exit
fi


if [[ $1 =~ ^[0-9]+.[0-9]+.[0-9]+(-SNAPSHOT|-RC[0-2]|-[0-9]+)?$ ]]; then
    echo
else
	echo
	echo 'Update failed due to incorrect versionnumber format: ' $1
	echo 'The format should be three numbers separated by dots with optional -SNAPSHOT. e.g.: 2.7.0 or 2.7.0-SNAPSHOT'
	echo
	echo "Usage: ./`basename $0 $1` 2.7.0 2.7.0-RC0"
	echo
	exit
fi

if [[ $2 =~ ^[0-9]+.[0-9]+.[0-9]+(-SNAPSHOT|-RC[0-2]|-[0-9]+)?$ ]]; then
    # Retrieve version and subversion
    if [[ $2 =~ ^[0-9]+.[0-9]+.[0-9]+-.*$ ]]; then
        new_version_main=`echo $2 | cut -d- -f1`
        sub_version=`echo $2 | cut -d- -f2`
    else
        new_version_main=$2
        sub_version="0"
    fi
    new_version_main_nopoint=${new_version_main//[.]/}
else
	echo
	echo 'Update failed due to incorrect new versionnumber format (' $2 ')'
	echo 'The format should be three numbers separated by dots with optional -SNAPSHOT. e.g.: 2.7.0 or 2.7.0-SNAPSHOT'
	echo
	echo "Usage: ./`basename $0 $1` 2.7.0 2.7.0-RC0"
	echo
	exit
fi


echo
echo 'Source version is: ' $version
echo 'Target version is: ' $new_version
echo 'Target main version is: ' $new_version_main
echo 'Target main version (without point) is: ' $new_version_main_nopoint
echo 'Target sub version is: ' $sub_version
echo


# Note: In MacOS (darwin10.0) sed requires -i .bak as option to work properly
if [[ $OSTYPE == 'darwin10.0' ]]; then
	sedopt='-i .bak'
else
	sedopt='-i'
fi

echo
echo 'Your Operating System is: ' $OSTYPE 
echo 'sed will use the following option: ' $sedopt
echo

# TODO: check that version is the version in the file to be updated.

# Update version in sphinx doc files
echo 'Documentation'
echo ' * updating docs/eng/users/source/conf.py'
sed $sedopt "s/${version}/${new_version_main}/g" docs/eng/users/source/conf.py 
echo ' * updating docs/eng/developer/source/conf.py'
sed $sedopt "s/${version}/${new_version_main}/g" docs/eng/developer/source/conf.py
echo ' * updating docs/eng/training/source/conf.py'
sed $sedopt "s/${version}/${new_version_main}/g" docs/eng/training/source/conf.py
echo ' * updating docs/eng/source/source/conf.py'
sed $sedopt "s/${version}/${new_version_main}/g" docs/fra/users/source/conf.py
echo ' * updating docs/widgets/conf.py'
sed $sedopt "s/${version}/${new_version_main}/g" docs/widgets/conf.py
echo

# Update installer
echo 'Installer'
echo '  * updating installer/build.xml'
sed $sedopt "s/property name=\"version\" value=\".*\"/property name=\"version\" value=\"${new_version_main}\"/g" installer/build.xml
sed $sedopt "s/property name=\"subVersion\" value=\".*\"/property name=\"subVersion\" value=\"${sub_version}\"/g" installer/build.xml
echo


# Update SQL - needs improvements
echo 'SQL script'
sed $sedopt "s/15,14,'version','.*'/15,14,'version','${new_version_main}'/g" web/src/main/webapp/WEB-INF/classes/setup/sql/data/data-db-default.sql
sed $sedopt "s/16,14,'subVersion','.*'/16,14,'subVersion','${sub_version}'/g" web/src/main/webapp/WEB-INF/classes/setup/sql/data/data-db-default.sql

find . -wholename *v${version//[.]/}/migrate-default.sql -exec sed $sedopt "s/value='${version}' WHERE name='version'/value='${new_version_main}' WHERE name='version'/g" {} \;
find . -wholename *v${version//[.]/}/migrate-default.sql -exec sed $sedopt "s/value='.*' WHERE name='subVersion'/value='${sub_version}' WHERE name='subVersion'/g" {} \;


# Update version pom files
echo 'Module'
mvn versions:set -DnewVersion=${new_version} -DgenerateBackupPoms=false -Pwith-doc
echo



